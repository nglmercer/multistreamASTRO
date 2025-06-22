const COMPARATORS = {
    ANY: 'any',
    EQUAL: 'equal',
    startsWith: 'startsWith',
    endsWith: 'endsWith',
    contains: 'contains',
    includes: 'includes',
    notStartsWith: 'notStartsWith',
    notEndsWith: 'notEndsWith',
    notContains: 'notContains',
    notIncludes: 'notIncludes',
    InRange: 'InRange'
};
const ROLECHECKS = {
    ANY: 'any',
    SUB: 'sub',
    MOD: 'mod',
    GIFTER: 'gifter',
    USER: 'usuario'
};
const CHATOPTIONS = {
    userFilter: "userFilter",
    wordFilter: "wordFilter",
    whitelist: "whitelist",
};
const COActions = {
    ban: "ban",
    unban: "unban",
    addItemProgrammatically: "addItemProgrammatically",
    removeItemProgrammatically: "removeItemProgrammatically"
}
export {
    COMPARATORS,
    ROLECHECKS,
    CHATOPTIONS,
    COActions
}