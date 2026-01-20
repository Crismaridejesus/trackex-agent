export const DEFAULT_APP_RULES = [
  // Productive apps
  { matcherType: 'EXACT', value: 'Visual Studio Code', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'IntelliJ IDEA', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'WebStorm', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'PyCharm', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'Xcode', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'Figma', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'Sketch', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'Adobe Photoshop', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'Adobe Illustrator', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'Terminal', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'iTerm2', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'Command Prompt', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'EXACT', value: 'PowerShell', category: 'PRODUCTIVE', priority: 10 },
  { matcherType: 'GLOB', value: '*SQL*', category: 'PRODUCTIVE', priority: 20 },
  { matcherType: 'GLOB', value: '*Studio*', category: 'PRODUCTIVE', priority: 20 },

  // Neutral apps
  { matcherType: 'EXACT', value: 'Google Chrome', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Safari', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Firefox', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Microsoft Edge', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Slack', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Microsoft Teams', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Zoom', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Mail', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Outlook', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'Finder', category: 'NEUTRAL', priority: 50 },
  { matcherType: 'EXACT', value: 'File Explorer', category: 'NEUTRAL', priority: 50 },

  // Unproductive apps (domain-based rules are in domain_rules table instead)
  { matcherType: 'EXACT', value: 'Games', category: 'UNPRODUCTIVE', priority: 30 },
  { matcherType: 'GLOB', value: '*Game*', category: 'UNPRODUCTIVE', priority: 40 },
  { matcherType: 'GLOB', value: '*Entertainment*', category: 'UNPRODUCTIVE', priority: 40 },
] as const
