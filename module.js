import fs from 'node:fs';
import path from 'path';
import { Buffer } from 'node:buffer';
import through from 'through2';

const PLUGIN_NAME = 'gulp-module-template';
const DEFAULTS = {
  keepImgAttr: ['class', 'id'],
  keepSvgAttr: ['viewBox', 'style'],
  preserveAspectRatio: 'none',
  removeFillColor: false,
  removeStrokeColor: false,
  fileDir: null,
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
    options.keepImgAttr.forEach((attrName, index) => {
      options.keepImgAttr[index] = `^${attrName}$`;
    });
    options.keepSvgAttr.forEach((attrName, index) => {
      options.keepSvgAttr[index] = `^${attrName}$`;
    });

    const fileDir = options.fileDir ? options.fileDir : file.base;
    let data = file.contents.toString();

    // Define regex
    const imageTagRegex = /<img[^>]*src=('|")[^>]*\.svg('|")[^>]*>/gims;
    const keepingImgAttrRegex = new RegExp(options.keepImgAttr.join('|'), 'i');
    const keepingSvgAttrRegex = new RegExp(options.keepSvgAttr.join('|'), 'i');
    const attributeRegex = /[\w/:.%;-]*=('|")[\w\s.:;/%-]*('|")/gms;
    const srcRegex = /src/i;
    const svgTagRegex = /<svg.*?>/gims;
    const svgTagContent = /(?<=<svg\s[^>]*>).*(?=<\/svg>)/gims;
    const svgTagWithContentRegex = /<svg.*<\/svg>/gims;
    const attrNameRegex = /[\w:._-]*(?==('|"))/;
    const attrValueRegex = /(?<==('|"))[\w\s:;./%_-]*(?=('|"))/;
    const preserveAspectRatioRegex = /preserveAspectRatio/;
    const fillRegex = /fill\s*?:\s*?#?[\w\s]*;?/gi;
    const strokeRegex = /stroke\s*?:\s*?#?[\w\s]*;?/gi;
    const emptyStyleAttrRegex = /style=('|")[\s\n]*('|")/gi;
    const indentBodyCloseRegex = /^(\s|\t)*(?=<\/body>)/gim;

    // get srcs and svg files
    const imgs = data.match(imageTagRegex);
    const imgAttributes = [];
    const svgAttributes = [];
    const srcAttributes = [];
    const svgs = [];
    const svglib = [];

    imgs.forEach((imgTag, imgTagIndex) => {
      // Extract img tag attributes
      const rawImgAttributes = imgTag.match(attributeRegex);
      let svgFilePath;
      let twin = false;

      imgAttributes[imgTagIndex] = [];
      svgAttributes[imgTagIndex] = [];

      rawImgAttributes.forEach((attr) => {
        const attrName = attr.match(attrNameRegex)[0];
        const attrValue = attr.match(attrValueRegex)[0];

        if (srcRegex.test(attrName)) {
          svgFilePath = attrValue;
          if (srcAttributes.includes(svgFilePath)) twin = true;
          srcAttributes[imgTagIndex] = attrValue;
          return;
        }

        if (keepingImgAttrRegex.test(attrName)) {
          imgAttributes[imgTagIndex].push(`${attrName}="${attrValue}"`);
        }
      });

      // compose svg file abs path
      const svgAbsPath = path.join(fileDir, svgFilePath);

      // load svg
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

      // set filename as id
      const id = srcAttributes[imgTagIndex].split('/').pop();

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
        if (options.removeFillColor) {
          symbol = symbol.replace(fillRegex, '');
        }
        if (options.removeStrokeColor) {
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
        `<img[^>]*src=('|")${val.replace(/\//g, '\\/')}('|")[^>]*>`,
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
      `${bodyIndent}<svg class="svg-lib">${svglib.join()}</svg>${nl}${bodyIndent}</body>`,
    );

    // return data to pipe
    file.contents = new Buffer.from(data);
    cb(null, file);
  });
};

export default main;
