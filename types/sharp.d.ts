// types/sharp.d.ts
// Sharp ships its types at a non-standard path. This declaration
// lets TypeScript resolve `require("sharp")` without complaining.
declare module "sharp" {
  import sharp from "sharp";
  export = sharp;
}
