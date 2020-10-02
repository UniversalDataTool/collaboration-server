const micro = require("micro")
const app = require("./app")

module.exports = ({ port = 3000 } = {}) => {
  const service = micro(app)
  console.log(`Running UDT collaboration server on port ${port}`)
  service.listen(port)
}
