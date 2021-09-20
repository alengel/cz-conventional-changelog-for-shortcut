'format cjs';

var engine = require('./engine');
var conventionalCommitTypes = require('./types');
var defaults = require('./defaults');
var configLoader = require('commitizen').configLoader;

var config = configLoader.load();

function getEnvOrConfig(env, configVar, defaultValue) {
  const isEnvSet = Boolean(env);
  const isConfigSet = typeof configVar === 'boolean';

  if (isEnvSet) return env === 'true';
  if (isConfigSet) return configVar;
  return defaultValue;
}

const options = {
  types: conventionalCommitTypes,
  scopes: config.scopes,
  shortcutMode: getEnvOrConfig(
    process.env.CZ_SHORTCUT_MODE,
    config.shortcutMode,
    defaults.shortcutMode
  ),
  skipScope: getEnvOrConfig(
    process.env.CZ_SKIP_SCOPE,
    config.skipScope,
    defaults.skipScope
  ),
  defaultType: process.env.CZ_TYPE || config.defaultType,
  defaultScope: process.env.CZ_SCOPE || config.defaultScope,
  defaultSubject: process.env.CZ_SUBJECT || config.defaultSubject,
  defaultBody: process.env.CZ_BODY || config.defaultBody,
  defaultIssues: process.env.CZ_ISSUES || config.defaultIssues,
  maxHeaderWidth:
    (process.env.CZ_MAX_HEADER_WIDTH &&
      parseInt(process.env.CZ_MAX_HEADER_WIDTH)) ||
    config.maxHeaderWidth ||
    defaults.maxHeaderWidth,
  minHeaderWidth:
    (process.env.CZ_MIN_HEADER_WIDTH &&
      parseInt(process.env.CZ_MIN_HEADER_WIDTH)) ||
    config.minHeaderWidth ||
    defaults.minHeaderWidth,
  maxLineWidth:
    (process.env.CZ_MAX_LINE_WIDTH &&
      parseInt(process.env.CZ_MAX_LINE_WIDTH)) ||
    config.maxLineWidth ||
    defaults.maxLineWidth,
  shortcutOptional: getEnvOrConfig(
    process.env.CZ_SHORTCUT_OPTIONAL,
    config.shortcutOptional,
    defaults.shortcutOptional
  ),
  shortcutPrefix:
    process.env.CZ_SHORTCUT_PREFIX ||
    config.shortcutPrefix ||
    defaults.shortcutPrefix,
  shortcutLocation:
    process.env.CZ_SHORTCUT_LOCATION ||
    config.shortcutLocation ||
    defaults.shortcutLocation,
  shortcutPrepend:
    process.env.CZ_SHORTCUT_PREPEND ||
    config.shortcutPrepend ||
    defaults.shortcutPrepend,
  shortcutAppend:
    process.env.CZ_SHORTCUT_APPEND ||
    config.shortcutAppend ||
    defaults.shortcutAppend,
  shortcutOrganization:
    process.env.CZ_SHORTCUT_ORGANIZATION ||
    config.shortcutOrganization ||
    defaults.shortcutOrganization
};

(function(options) {
  try {
    var commitlintLoad = require('@commitlint/load');
    commitlintLoad().then(function(clConfig) {
      if (clConfig.rules) {
        var maxHeaderLengthRule = clConfig.rules['header-max-length'];
        if (
          typeof maxHeaderLengthRule === 'object' &&
          maxHeaderLengthRule.length >= 3 &&
          !process.env.CZ_MAX_HEADER_WIDTH &&
          !config.maxHeaderWidth
        ) {
          options.maxHeaderWidth = maxHeaderLengthRule[2];
        }
      }
    });
  } catch (err) {}
})(options);

module.exports = engine(options);
