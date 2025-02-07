import fs from 'node:fs';
import path from 'path';
import { Buffer } from 'node:buffer';
import through from 'through2';

const PLUGIN_NAME = 'gulp-module-template';
const DEFAULTS = {
  imgAttrToRemove: [],
  keepSvgAttr: ['viewBox', 'style'],
  preserveAspectRatio: 'none',
  removeFillColor: true,
  removeStrokeColor: true,
  fileDir: null,
  keepFillsAttrName: 'keepFills',
  keepStrokesAttrName: 'keepStrokes',
  keepLinkedAttrName: 'keepLinked',
};

const main = (user_options) => {
  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }
    if (file.isStream()) {
      this.emit('error', new Error(`${PLUGIN_NAME}: Streaming not supported.`));
      return cb(null, file);
    }

    const options = Object.assign({}, DEFAULTS, user_options || {});
    options.imgAttrToRemove.push('src');
    options.imgAttrToRemove.push('alt');
    options.imgAttrToRemove.forEach((attrName, index) => {
      options.imgAttrToRemove[index] = `^${attrName}$`;
    });
    options.keepSvgAttr.forEach((attrName, index) => {
      options.keepSvgAttr[index] = `^${attrName}$`;
    });

    const fileDir = options.fileDir ? options.fileDir : file.base;
    let data = file.contents.toString();

    // Define regex
    const imageTagRegex = new RegExp(
      `<img(((?!${options.keepLinkedAttrName}))[^>])*src=['"][^>]*\.svg['"](((?!${options.keepLinkedAttrName}))[^>])*>`,
      'gims'
    );
    const imgAttrToRemoveRegex = new RegExp(options.imgAttrToRemove.join('|'), 'i');
    const keepingSvgAttrRegex = new RegExp(options.keepSvgAttr.join('|'), 'i');
    const attributeRegex = /([\w/:.%;-]*=('|")[\w\s.:;/%-]*('|"))|((?<=\s)[^<>\s'"=,]*(?=(\s|>)))/gms;
    const srcRegex = /src/i;
    const svgTagRegex = /<svg.*?>/gims;
    const svgTagContent = /(?<=<svg\s[^>]*>).*(?=<\/svg>)/gims;
    const svgTagWithContentRegex = /<svg.*<\/svg>/gims;
    const attrNameRegex = /[\w:._-]*(?==('|"))/;
    const attrValueRegex = /(?<==('|"))[\w\s:;./%_-]*(?=('|"))/;
    const preserveAspectRatioRegex = /preserveAspectRatio/;
    const fillRegex = /fill\s?[:=]['"]?\s?#?[\w\s]*;?['"]?/gi;
    const strokeRegex = /stroke\s?[:=]['"]?\s?#?[\w\s]*;?['"]?/gi;
    const emptyStyleAttrRegex = /style=('|")[\s\n]*('|")/gi;
    const indentBodyCloseRegex = /^(\s|\t)*(?=<\/body>)/gim;
    const isNotBoolAttributeRegex = /=('|")/;
    const keepLinkedAttrRegex = new RegExp(`(?<=<img[^>]*)\\s${options.keepLinkedAttrName}(?=[^>]*>)`, 'g');

    // get srcs and svg files
    const imgs = data.match(imageTagRegex);

    // if img tag with svg src not found - return data to pipe and return
    if (imgs === null) {
      file.contents = new Buffer.from(data);
      cb(null, file);
      return;
    }

    const imgAttributes = [];
    const svgAttributes = [];
    const srcAttributes = [];
    const svgs = [];
    const svglib = [];

    imgs.forEach((imgTag, imgTagIndex) => {
      // Extract img tag attributes
      const rawImgAttributes = imgTag.match(attributeRegex);
      let svgFilePath;
      let keepFills = false;
      let keepStrokes = false;

      imgAttributes[imgTagIndex] = [];
      svgAttributes[imgTagIndex] = [];

      const src = []

      rawImgAttributes.forEach((attr) => {
        const isNotBoolAttr = isNotBoolAttributeRegex.test(attr);

        let attrName, attrValue;
        if (isNotBoolAttr) {
          attrName = attr.match(attrNameRegex)[0];
          attrValue = attr.match(attrValueRegex)[0];
        } else {
          attrName = attr;
          attrValue = 'true';
        }

        if (srcRegex.test(attrName)) {
          svgFilePath = attrValue;
          src[0] = attrValue;
          return;
        }
        if (attrName === options.keepFillsAttrName) {
          src[1] = true;
          keepFills = true;
          return;
        }
        if (attrName === options.keepStrokesAttrName){
          src[2] = true;
          keepStrokes = true;
          return;
        }

        if (!imgAttrToRemoveRegex.test(attrName)) {
          if (isNotBoolAttr) {
            imgAttributes[imgTagIndex].push(`${attrName}="${attrValue}"`);
          } else {
            imgAttributes[imgTagIndex].push(`${attrName}`);
          }
        }
      });

      // check twins and store src
      let twin = false;
      srcAttributes.some((srcAttr) => {
        if (srcAttr[0] === src[0] && srcAttr[1] === src[1] && srcAttr[2] === src[2]) {
          twin = true;
          return true;
        }
        return false;
      });
      srcAttributes.push(src);

      // load svg
      const svgAbsPath = path.join(fileDir, svgFilePath);
      let svg = fs.readFileSync(svgAbsPath, { encoding: 'utf8', flag: 'r' }).split('\n');
      svg.forEach((_, index) => {
        svg[index] = svg[index].trim();
      });
      svg = svg.join('');
      svg = svg.match(svgTagWithContentRegex)[0];

      // Extract svg file attributes
      const svgTag = svg.match(svgTagRegex)[0];
      const rawSvgAttributes = svgTag.match(attributeRegex);

      let preserveAspectRatio = options.preserveAspectRatio;
      rawSvgAttributes.forEach((attr) => {
        const attrName = attr.match(attrNameRegex)[0];
        const attrValue = attr.match(attrValueRegex)[0];

        if (keepingSvgAttrRegex.test(attrName)) {
          if (preserveAspectRatioRegex.test(attrName)) {
            preserveAspectRatio = attrValue;
            return;
          }
          svgAttributes[imgTagIndex].push(`${attrName}="${attrValue}"`);
        }
      });
      svgAttributes[imgTagIndex].push(`preserveAspectRatio="${preserveAspectRatio}"`);

      // generate id
      const simpleHash = [...srcAttributes[imgTagIndex][0]].reduce((prev, char, index) => {
        return prev + char.charCodeAt(0) * index;
      }, 0);
      const fillOpt = srcAttributes[imgTagIndex][1] ? '1' : '0';
      const strokeOpt = srcAttributes[imgTagIndex][2] ? '1' : '0';
      const id = srcAttributes[imgTagIndex][0].split('/').pop() + '-' + simpleHash.toString() + fillOpt + strokeOpt;

      // put svg attributes to symbol
      if (!twin) {
        let symbol = `<symbol id="${
            id
          }"${
            svgAttributes[imgTagIndex].length > 0 ? ' ' : ''
          }${
            svgAttributes[imgTagIndex].join(' ')
          }>${
            svg.match(svgTagContent)[0]
          }</symbol>`;
        // remove fills and strokes
        if (options.removeFillColor && !keepFills) {
          symbol = symbol.replace(fillRegex, '');
        }
        if (options.removeStrokeColor && !keepStrokes) {
          symbol = symbol.replace(strokeRegex, '');
        }
        symbol = symbol.replace(emptyStyleAttrRegex, '');
        svglib.push(symbol);
      }

      // put img attributes to svg tag
      svg = `<svg${
          imgAttributes[imgTagIndex].length > 0 ? ' ' : ''
        }${
          imgAttributes[imgTagIndex].join(' ')
        }><use href="#${
          id
        }"/></svg>`;

      svgs.push(svg);
    });

    // replace img tags with svg
    srcAttributes.forEach((val, index) => {
      const imgSrcRegex = new RegExp(
        // generate dynamic regex for image tag with src = 'val' value
        `<img((?!${
            options.keepLinkedAttrName
          })[^>])*src=['"]${
            val[0].replace(/\//g, '\\/')
          }['"]((?!${
            options.keepLinkedAttrName
          })[^>])*>`,
        'ms',
      );
      data = data.replace(imgSrcRegex, svgs[index]);
    });

    // add svglib to body
    let bodyIndent = data.match(indentBodyCloseRegex);
    let nl = '\n';
    if (bodyIndent) {
      bodyIndent = bodyIndent[0];
    } else {
      bodyIndent = nl = '';
    }
    data = data.replace(
      /<\/body>/,
      `${bodyIndent}<svg class="svg-lib">${svglib.join('')}</svg>${nl}${bodyIndent}</body>`,
    );

    // remove keepLinked attr from ignored img tags
    data = data.replace(keepLinkedAttrRegex, '');

    // return data to pipe
    file.contents = new Buffer.from(data);
    cb(null, file);
  });
};

export default main;
