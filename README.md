# gulp-imgsrc-to-inline-svg

Simple Gulp plugin for replace img src='*.svg' tag to inline svg sprite.

## Install:

```shell
npm i -D gulp-imgsrc-to-inline-svg
```

## Usage:

```js
import gulp from 'gulp';
import imgSrcToInlineSVG from 'gulp-imgsrc-to-inline-svg';

export const htmlProcessing = () => {
  return gulp.src('./src/**/*.html')
    .pipe(
      imgSrcToInlineSVG({
        // Options here
      }),
    )
    .pipe(gulp.dest('dist'));
};

export default htmlProcessing;
```
### What this will do:
```html
    ...
    <img class="svg" src="./some1.svg" keepLinked>
    <img class="svg" src="./some2.svg" keepFills keepStrokes>
  </body>
</html>
```
Will be transformed to:
```html
    ...
    <img class="svg" src="./some1.svg">
    <svg class="svg"><use href="#some2.svg-2690110"/></svg>
    <svg class="svg-lib"><symbol id="some2.svg-2690110" viewBox="0 0 ...
  </body>
</html>
```

## Options:
The list of options has changed. If you used previous versions, please read it again. This version changes the handling of img tag attributes and adds the ability to leave svg files linked with img tag.

`imgAttrToRemove: []` - list of image tag attributes that will not be copied to the svg tag that replaces it ("src" and "alt" will be deleted anyway).

`keepSvgAttr: ['viewBox', 'style']` - default value for the list of svg file attributes that will be copied to the symbol in sprite.

`preserveAspectRatio: 'none'` - if keepSvgAttr and svg file not contain preserveAspectRatio attribute - that value will be used. Other values here: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio.

`removeFillColor: true`: Default value.

`removeStrokeColor: true`: Default value.

`fileDir: null`: Default value. Use this parameter when the previous pipe changes the directory where the original html is located.

`keepFillsAttrName: 'keepFills'` - default name of attribute in img tag that will disable deletion of fills colors in svg file.

`keepStrokesAttrName: 'keepStrokes'` - default name of attribute in img tag that will disable deletion of stroke colors in svg file.

`keepLinkedAttrName: 'keepLinked'` - default name of attribute in img tag that will prevent that tag from changes (attribute itself will be deleted).
