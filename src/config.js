const packageJson = require('../package.json')
const startCase = require('lodash/startCase')

// TODO [probably] doesnt treeshake and will import lodash when you just want a string
module.exports = {
  projectName: startCase(packageJson.name),
  fromEmail: packageJson.author,
  legalText: ``, // FIXME needs more legalese
}
