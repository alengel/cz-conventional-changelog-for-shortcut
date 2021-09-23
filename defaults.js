var conventionalCommitTypes = require('./types');

module.exports = {
  types: conventionalCommitTypes,
  shortcutMode: true,
  skipScope: true,
  maxHeaderWidth: 72,
  minHeaderWidth: 2,
  maxLineWidth: 100,
  shortcutPrefix: 'sc',
  shortcutOptional: false,
  shortcutLocation: 'pre-description',
  shortcutPrepend: '',
  shortcutAppend: '',
  shortcutOrganization: ''
};
