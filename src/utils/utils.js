export function minImageNameGenerator(filePath, fileName) {
  const fileNameArr = fileName.split(".");
  const minStr = "_min";
  const minImageName = `${fileNameArr[0]}${minStr}.${fileNameArr[1]}`;

  return filePath.replace(fileName, minImageName)
}
