const fjp = require("fast-json-patch")

module.exports = async ({ patch, workingSummaryObject }) => {
  fjp.applyPatch(workingSummaryObject, [patch])
}
