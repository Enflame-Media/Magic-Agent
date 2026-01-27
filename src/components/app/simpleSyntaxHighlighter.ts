export type SyntaxToken = {
  text: string;
  type: string;
  nestLevel?: number;
};

type TokenPattern = {
  regex: RegExp;
  type: string;
  captureGroup?: number;
};

const bracketPairs = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>',
};

const openBrackets = Object.keys(bracketPairs);
const closeBrackets = Object.values(bracketPairs);

const keywordSets = {
  controlFlow: ['if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'yield', 'try', 'catch', 'finally', 'throw', 'with'],
  keywords: ['function', 'const', 'let', 'var', 'def', 'class', 'interface', 'enum', 'struct', 'union', 'namespace', 'module'],
  types: ['int', 'string', 'bool', 'float', 'double', 'char', 'void', 'any', 'unknown', 'never', 'object', 'array', 'number', 'boolean'],
  modifiers: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'virtual', 'override', 'async', 'await', 'export', 'default'],
  boolean: ['true', 'false', 'null', 'undefined', 'None', 'True', 'False', 'nil'],
  imports: ['import', 'from', 'export', 'require', 'include', 'using', 'package'],
};

function getKeywordSets(language: string | null) {
  if (!language) return keywordSets;

  const lang = language.toLowerCase();
  const updated = {
    controlFlow: [...keywordSets.controlFlow],
    keywords: [...keywordSets.keywords],
    types: [...keywordSets.types],
    modifiers: [...keywordSets.modifiers],
    boolean: [...keywordSets.boolean],
    imports: [...keywordSets.imports],
  };

  if (lang === 'python' || lang === 'py') {
    updated.keywords.push('def', 'lambda', 'pass', 'global', 'nonlocal', 'as', 'in', 'is', 'not', 'and', 'or');
    updated.types.push('str', 'list', 'dict', 'tuple', 'set');
  } else if (lang === 'typescript' || lang === 'ts') {
    updated.types.push('Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit');
    updated.keywords.push('type', 'interface', 'extends', 'implements', 'keyof', 'typeof');
  } else if (lang === 'java') {
    updated.keywords.push('package', 'extends', 'implements', 'super', 'this');
    updated.modifiers.push('synchronized', 'transient', 'volatile', 'native', 'strictfp');
  }

  return updated;
}

function createPatterns(language: string | null): TokenPattern[] {
  const sets = getKeywordSets(language);

  return [
    { regex: /(\/\*[\s\S]*?\*\/)/g, type: 'comment' },
    { regex: /(\/\/.*$)/gm, type: 'comment' },
    { regex: /(#.*$)/gm, type: 'comment' },
    { regex: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, type: 'docstring' },
    { regex: /(r?["'`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, type: 'string' },
    { regex: /(\/(?:[^/\\\n]|\\.)+\/[gimuy]*)/g, type: 'regex' },
    { regex: /\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, type: 'number' },
    { regex: /@\w+/g, type: 'decorator' },
    { regex: /\b(function|def|async function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'function', captureGroup: 2 },
    { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, type: 'function' },
    { regex: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, type: 'method', captureGroup: 1 },
    { regex: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'property', captureGroup: 1 },
    { regex: new RegExp(`\\b(${sets.imports.join('|')})\\b`, 'g'), type: 'import' },
    { regex: new RegExp(`\\b(${sets.controlFlow.join('|')})\\b`, 'g'), type: 'controlFlow' },
    { regex: new RegExp(`\\b(${sets.keywords.join('|')})\\b`, 'g'), type: 'keyword' },
    { regex: new RegExp(`\\b(${sets.types.join('|')})\\b`, 'g'), type: 'type' },
    { regex: new RegExp(`\\b(${sets.modifiers.join('|')})\\b`, 'g'), type: 'modifier' },
    { regex: new RegExp(`\\b(${sets.boolean.join('|')})\\b`, 'g'), type: 'boolean' },
    { regex: /(===|!==|==|!=|<=|>=|<|>)/g, type: 'comparison' },
    { regex: /(&&|\|\||!)/g, type: 'logical' },
    { regex: /(=|\+=|-=|\*=|\/=|%=|\|=|&=|\^=)/g, type: 'assignment' },
    { regex: /(\+|-|\*|\/|%|\*\*)/g, type: 'operator' },
    { regex: /(\?|:)/g, type: 'operator' },
    { regex: /([()[\]{}])/g, type: 'bracket' },
    { regex: /([.,;])/g, type: 'punctuation' },
  ];
}

function calculateBracketNesting(code: string): Map<number, number> {
  const nestingMap = new Map<number, number>();
  const stack: Array<{ char: string; pos: number }> = [];

  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];
    if (!char) {
      continue;
    }

    if (openBrackets.includes(char)) {
      stack.push({ char, pos: i });
      nestingMap.set(i, stack.length);
    } else if (closeBrackets.includes(char)) {
      if (stack.length > 0) {
        const lastOpen = stack.pop();
        if (lastOpen && bracketPairs[lastOpen.char as keyof typeof bracketPairs] === char) {
          nestingMap.set(i, stack.length + 1);
        }
      }
    }
  }

  return nestingMap;
}

export function tokenizeCode(code: string, language: string | null): SyntaxToken[] {
  if (!language) {
    return [{ text: code, type: 'default' }];
  }

  const tokens: SyntaxToken[] = [];
  const patterns = createPatterns(language);
  const nestingMap = calculateBracketNesting(code);
  const lines = code.split('\n');
  let globalOffset = 0;

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      tokens.push({ text: '\n', type: 'default' });
      globalOffset += 1;
    }

    const lineTokens: Array<{ start: number; end: number; type: string; text: string; captureGroup?: number }> = [];

    patterns.forEach((pattern) => {
      let match;
      pattern.regex.lastIndex = 0;
      while ((match = pattern.regex.exec(line)) !== null) {
        const tokenText = pattern.captureGroup ? match[pattern.captureGroup] : match[0];
        if (!tokenText) {
          continue;
        }
        const tokenStart = pattern.captureGroup ? match.index + match[0].indexOf(tokenText) : match.index;

        lineTokens.push({
          start: tokenStart,
          end: tokenStart + tokenText.length,
          type: pattern.type,
          text: tokenText,
          captureGroup: pattern.captureGroup,
        });
      }
    });

    lineTokens.sort((a, b) => a.start - b.start);

    const filteredTokens: typeof lineTokens = [];
    let lastEnd = 0;
    lineTokens.forEach((token) => {
      if (token.start >= lastEnd) {
        filteredTokens.push(token);
        lastEnd = token.end;
      }
    });

    let currentIndex = 0;
    filteredTokens.forEach((token) => {
      if (token.start > currentIndex) {
        const beforeText = line.slice(currentIndex, token.start);
        if (beforeText) {
          tokens.push({ text: beforeText, type: 'default' });
        }
      }

      if (token.type === 'bracket') {
        const globalPos = globalOffset + token.start;
        const nestLevel = nestingMap.get(globalPos) || 1;
        tokens.push({
          text: token.text,
          type: token.type,
          nestLevel,
        });
      } else {
        tokens.push({ text: token.text, type: token.type });
      }

      currentIndex = token.end;
    });

    if (currentIndex < line.length) {
      const remainingText = line.slice(currentIndex);
      if (remainingText) {
        tokens.push({ text: remainingText, type: 'default' });
      }
    }

    globalOffset += line.length;
  });

  return tokens;
}
