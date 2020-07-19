const getSampleObject = (sample) => {
  const content = JSON.parse(sample.content);
  const annotation = JSON.parse(sample.annotation);
  return { ...content, annotation };
};

module.exports = getSampleObject;
