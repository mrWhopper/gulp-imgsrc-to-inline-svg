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
        removeFillColor: true,
        removeStrokeColor: true,
      }),
    )
    .pipe(gulp.dest('dist'));
};

export default htmlProcessing;
```

## Options:

`keepImgAttr`: ['class', 'id'] - default value for the list of image tag attributes that will be copied to the svg tag that replaces it.

`keepSvgAttr`: ['viewBox', 'style'] - default value for the list of svg file attributes that will be copied to the symbol in sprite.

`preserveAspectRatio`: 'none' - if keepSvgAttr and svg file not contain preserveAspectRatio attribute - that value will be used. Other values here: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio.

`removeFillColor`: Default false.

`removeStrokeColor`: Default false.

`fileDir`: Default null. Use this parameter when the previous pipe changes the directory where the original html is located.