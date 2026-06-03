# 2 vs 2 Tennis Evolution Demo

p5.js conversion of an old Processing sketch.

## Files

- `index.html`: standalone demo page
- `style.css`: demo styling
- `sketch.js`: p5.js simulation code

## Quarto/GitHub Pages

Place this folder in your Quarto site, for example:

```text
projects/tennis-2v2-p5js/
  index.html
  style.css
  sketch.js
```

Make sure `_quarto.yml` copies the project folder:

```yaml
project:
  type: website
  output-dir: docs
  resources:
    - "projects/**"
```

Then link to the demo with:

```markdown
[2 vs 2 Tennis Demo](projects/tennis-2v2-p5js/)
```

or embed it with an iframe.

## Notes

The original Processing sketch evaluated a full generation in one tight loop. This p5.js version chunks the hidden evaluation into batches so the browser does not freeze as easily.

The roulette-wheel selection was also made safer by using floating-point values and random fallback selection when all fitness values are zero.
