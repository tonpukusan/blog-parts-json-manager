export function validateKattene(data) {
  const errs = [];
  if (!data.title) errs.push("title が必須です");
  if (!data.imgUrl) errs.push("imgUrl が必須です");
  if (!data.aUrl) errs.push("aUrl が必須です");
  if (data.btnStyle && !["__one","__two","__three","__four","__five"].includes(data.btnStyle)) {
    errs.push("btnStyle が許容値ではありません");
  }
  return errs;
}
