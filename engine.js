'format cjs';

const wrap = require('word-wrap');
const map = require('lodash.map');
const longest = require('longest');
const rightPad = require('right-pad');
const chalk = require('chalk');
const branch = require('git-branch');
const boxen = require('boxen');

const defaults = require('./defaults');
const LimitedInputPrompt = require('./LimitedInputPrompt');
const filter = function(array) {
  return array.filter(function(x) {
    return x;
  });
};

const filterSubject = function(subject) {
  subject = subject.trim();
  while (subject.endsWith('.')) {
    subject = subject.slice(0, subject.length - 1);
  }
  return subject;
};

// This can be any kind of SystemJS compatible module.
// We use Commonjs here, but ES6 or AMD would do just
// fine.
module.exports = function(options) {
  const getFromOptionsOrDefaults = function(key) {
    return options[key] || defaults[key];
  };
  const getShortcutIssueLocation = function(
    location,
    type,
    scope,
    shortcutWithDecorators,
    subject
  ) {
    switch (location) {
      case 'pre-type':
        return shortcutWithDecorators + type + scope + ': ' + subject;
        break;
      case 'pre-description':
        return type + scope + ': ' + shortcutWithDecorators + subject;
        break;
      case 'post-description':
        return type + scope + ': ' + subject + ' ' + shortcutWithDecorators;
        break;
      default:
        return type + scope + ': ' + shortcutWithDecorators + subject;
    }
  };
  const types = getFromOptionsOrDefaults('types');

  const length = longest(Object.keys(types)).length + 1;
  const choices = map(types, function(type, key) {
    return {
      name: rightPad(key + ':', length) + ' ' + type.description,
      value: key
    };
  });

  const minHeaderWidth = getFromOptionsOrDefaults('minHeaderWidth');
  const maxHeaderWidth = getFromOptionsOrDefaults('maxHeaderWidth');

  const branchName = branch.sync() || '';
  const shortcutIssueRegex = /(?<shortcutIssue>(?<!([A-Z0-9]{1,10})-?)[A-Z0-9]+-\d+)/;
  const matchResult = branchName.match(shortcutIssueRegex);
  const shortcutIssue =
    matchResult && matchResult.groups && matchResult.groups.shortcutIssue;
  const hasScopes =
    options.scopes &&
    Array.isArray(options.scopes) &&
    options.scopes.length > 0;

  return {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
    // template and will keep empty lines.
    prompter: function(cz, commit, testMode) {
      cz.registerPrompt('limitedInput', LimitedInputPrompt);

      // Let's ask some questions of the user
      // so that we can populate our commit
      // template.
      //
      // See inquirer.js docs for specifics.
      // You can also opt to use another input
      // collection library if you prefer.
      cz.prompt([
        {
          type: 'list',
          name: 'type',
          message: "Select the type of change that you're committing:",
          choices: choices,
          default: options.defaultType
        },
        {
          type: 'input',
          name: 'shortcut',
          message:
            'Enter Shortcut story (' +
            getFromOptionsOrDefaults('shortcutPrefix') +
            '-1234)' +
            (options.shortcutOptional ? ' (optional)' : '') +
            ':',
          when: options.shortcutMode,
          default: shortcutIssue || '',
          validate: function(shortcut) {
            return (
              (options.shortcutOptional && !shortcut) ||
              /^(?<!([A-Z0-9]{1,10})-?)[A-Z0-9]+-\d+$/.test(shortcut)
            );
          },
          filter: function(shortcut) {
            return shortcut.toUpperCase();
          }
        },
        {
          type: hasScopes ? 'list' : 'input',
          name: 'scope',
          when: !options.skipScope,
          choices: hasScopes ? options.scopes : undefined,
          message:
            'What is the scope of this change (e.g. component or file name): ' +
            (hasScopes ? '(select from the list)' : '(press enter to skip)'),
          default: options.defaultScope,
          filter: function(value) {
            return value.trim().toLowerCase();
          }
        },
        {
          type: 'limitedInput',
          name: 'subject',
          message: 'Write a short, imperative tense description of the change:',
          default: options.defaultSubject,
          maxLength: maxHeaderWidth,
          leadingLabel: answers => {
            const shortcut = answers.shortcut ? ` ${answers.shortcut}` : '';
            let scope = '';

            if (answers.scope && answers.scope !== 'none') {
              scope = `(${answers.scope})`;
            }

            return `${answers.type}${scope}:${shortcut}`;
          },
          validate: input =>
            input.length >= minHeaderWidth ||
            `The subject must have at least ${minHeaderWidth} characters`,
          filter: function(subject) {
            return filterSubject(subject);
          }
        },
        {
          type: 'input',
          name: 'body',
          message:
            'Provide a longer description of the change: (press enter to skip)\n',
          default: options.defaultBody
        },
        {
          type: 'confirm',
          name: 'isBreaking',
          message: 'Are there any breaking changes?',
          default: false
        },
        {
          type: 'confirm',
          name: 'isBreaking',
          message:
            'You do know that this will bump the major version, are you sure?',
          default: false,
          when: function(answers) {
            return answers.isBreaking;
          }
        },
        {
          type: 'input',
          name: 'breaking',
          message: 'Describe the breaking changes:\n',
          when: function(answers) {
            return answers.isBreaking;
          }
        },

        {
          type: 'confirm',
          name: 'isIssueAffected',
          message: 'Does this change affect any open issues?',
          default: options.defaultIssues ? true : false,
          when: !options.shortcutMode
        },
        {
          type: 'input',
          name: 'issuesBody',
          default: '-',
          message:
            'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself:\n',
          when: function(answers) {
            return (
              answers.isIssueAffected && !answers.body && !answers.breaking
            );
          }
        },
        {
          type: 'input',
          name: 'issues',
          message: 'Add issue references (e.g. "fix #123", "re #123".):\n',
          when: function(answers) {
            return answers.isIssueAffected;
          },
          default: options.defaultIssues ? options.defaultIssues : undefined
        }
      ]).then(async function(answers) {
        const wrapOptions = {
          trim: true,
          cut: false,
          newline: '\n',
          indent: '',
          width: options.maxLineWidth
        };

        // parentheses are only needed when a scope is present
        const scope = answers.scope ? '(' + answers.scope + ')' : '';

        // Get Shortcut story prepend and append decorators
        const prepend = options.shortcutPrepend || '';
        const append = options.shortcutAppend || '';
        const shortcutWithDecorators = answers.shortcut
          ? prepend + answers.shortcut + append + ' '
          : '';

        // Hard limit this line in the validate
        const head = getShortcutIssueLocation(
          options.shortcutLocation,
          answers.type,
          scope,
          shortcutWithDecorators,
          answers.subject
        );

        // Wrap these lines at options.maxLineWidth characters
        const body = answers.body ? wrap(answers.body, wrapOptions) : false;

        // Apply breaking change prefix, removing it if already present
        let breaking = answers.breaking ? answers.breaking.trim() : '';
        breaking = breaking
          ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE: /, '')
          : '';
        breaking = breaking ? wrap(breaking, wrapOptions) : false;

        const issues = answers.issues
          ? wrap(answers.issues, wrapOptions)
          : false;

        const shortcutUrl =
          answers.shortcut && options.shortcutOrganization
            ? `https://app.shortcut.com/${options.shortcutOrganization}/story/${
                answers.shortcut
              }`
            : false;

        const fullCommit = filter([
          head,
          body,
          breaking,
          issues,
          shortcutUrl
        ]).join('\n\n');

        if (testMode) {
          return commit(fullCommit);
        }

        console.log();
        console.log(chalk.underline('Commit preview:'));
        console.log(boxen(chalk.green(fullCommit), { padding: 1, margin: 1 }));

        const { doCommit } = await cz.prompt([
          {
            type: 'confirm',
            name: 'doCommit',
            message: 'Are you sure that you want to commit?'
          }
        ]);

        if (doCommit) {
          commit(fullCommit);
        }
      });
    }
  };
};
