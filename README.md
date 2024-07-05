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
    <img class="svg" src="./some.svg">
  </body>
</html>
```
Will be transformed to:
```html
    ...
    <svg class="svg"><use href="#some.svg"/></svg>
    <svg class="svg-lib"><symbol id="some.svg" viewBox="0 0 ...
  </body>
</html>
```

## Options:

`keepImgAttr`: ['class', 'id'] - default value for the list of image tag attributes that will be copied to the svg tag that replaces it.

`keepSvgAttr`: ['viewBox', 'style'] - default value for the list of svg file attributes that will be copied to the symbol in sprite.

`preserveAspectRatio`: 'none' - if keepSvgAttr and svg file not contain preserveAspectRatio attribute - that value will be used. Other values here: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio.

`removeFillColor`: Default true.

`removeStrokeColor`: Default true.

`fileDir`: Default null. Use this parameter when the previous pipe changes the directory where the original html is located.

`keepFillsAttrName`: 'keepFills' - default name of attribute in img tag that will disable deletion of fills colors in svg file.

`keepStrokesAttrName`: 'keepStrokes' - default name of attribute in img tag that will disable deletion of stroke colors in svg file.
