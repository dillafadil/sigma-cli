const {
    parseReviewResponse,
    parseReviewItem,
    reviewToJson,
    severityColor,
    severityIcon
  } = require('../lib/review');
  
  describe('parseReviewItem', () => {
    test('parses critical item with line number', () => {
      const result = parseReviewItem('- [critical:12] Null pointer dereference');
      expect(result).toEqual({
        severity: 'critical',
        line: 12,
        text: 'Null pointer dereference'
      });
    });
  
    test('parses warning item with line number', () => {
      const result = parseReviewItem('- [warning:25] Possible race condition');
      expect(result).toEqual({
        severity: 'warning',
        line: 25,
        text: 'Possible race condition'
      });
    });
  
    test('parses info item with line number', () => {
      const result = parseReviewItem('- [info:8] Consider using const');
      expect(result).toEqual({
        severity: 'info',
        line: 8,
        text: 'Consider using const'
      });
    });
  
    test('returns null for non-matching line', () => {
      expect(parseReviewItem('not a review item')).toBeNull();
      expect(parseReviewItem('')).toBeNull();
      expect(parseReviewItem('- no severity here')).toBeNull();
    });
  
    test('handles case-insensitive severity', () => {
      const result = parseReviewItem('- [CRITICAL:5] Bad bug');
      expect(result.severity).toBe('critical');
      expect(result.line).toBe(5);
    });
  });
  
  describe('parseReviewResponse', () => {
    test('parses full review response with sections and items', () => {
      const response = `[Potential Bugs]
  - [critical:12] Null pointer dereference on variable 'config'
  - [warning:25] Possible race condition in async handler
  
  [Code Quality]
  - [warning:5] Function 'processData' is too long
  - [info:30] Consider using const instead of let
  
  [Suggestions]
  - [info:8] Extract validation logic into a separate function`;
  
      const result = parseReviewResponse(response);
  
      expect(result.sections.length).toBe(3);
  
      expect(result.sections[0].name).toBe('Potential Bugs');
      expect(result.sections[0].items.length).toBe(2);
      expect(result.sections[0].items[0]).toEqual({
        severity: 'critical',
        line: 12,
        text: "Null pointer dereference on variable 'config'"
      });
      expect(result.sections[0].items[1]).toEqual({
        severity: 'warning',
        line: 25,
        text: 'Possible race condition in async handler'
      });
  
      expect(result.sections[1].name).toBe('Code Quality');
      expect(result.sections[1].items.length).toBe(2);
      expect(result.sections[1].items[0].severity).toBe('warning');
      expect(result.sections[1].items[1].severity).toBe('info');
  
      expect(result.sections[2].name).toBe('Suggestions');
      expect(result.sections[2].items.length).toBe(1);
      expect(result.sections[2].items[0].severity).toBe('info');
    });
  
    test('handles empty sections', () => {
      const response = `[Potential Bugs]
  
  [Code Quality]
  - [warning:5] Something
  
  [Suggestions]`;
  
      const result = parseReviewResponse(response);
      expect(result.sections.length).toBe(3);
      expect(result.sections[0].items.length).toBe(0);
      expect(result.sections[1].items.length).toBe(1);
      expect(result.sections[2].items.length).toBe(0);
    });
  
    test('fallback to info severity for items without [severity:line]', () => {
      const response = `[Potential Bugs]
  - Some plain text finding without severity`;
  
      const result = parseReviewResponse(response);
      expect(result.sections[0].items.length).toBe(1);
      expect(result.sections[0].items[0].severity).toBe('info');
      expect(result.sections[0].items[0].line).toBeNull();
      expect(result.sections[0].items[0].text).toBe('Some plain text finding without severity');
    });
  
    test('returns empty sections for null/empty response', () => {
      expect(parseReviewResponse(null).sections).toEqual([]);
      expect(parseReviewResponse('').sections).toEqual([]);
      expect(parseReviewResponse('   ').sections).toEqual([]);
    });
  
    test('counts total items correctly', () => {
      const response = `[Potential Bugs]
  - [critical:1] bug1
  - [warning:2] bug2
  
  [Code Quality]
  - [info:3] quality1
  
  [Suggestions]
  - [info:4] sug1
  - [info:5] sug2
  - [info:6] sug2`;
  
      const result = parseReviewResponse(response);
      const total = result.sections.reduce((sum, s) => sum + s.items.length, 0);
      expect(total).toBe(6);
    });
  });
  
  describe('reviewToJson', () => {
    test('produces valid JSON with file and sections', () => {
      const parsed = parseReviewResponse(`[Potential Bugs]
  - [critical:10] Bad bug`);
  
      const json = reviewToJson('app.js', parsed);
      const obj = JSON.parse(json);
  
      expect(obj.file).toBe('app.js');
      expect(obj.sections.length).toBe(1);
      expect(obj.sections[0].name).toBe('Potential Bugs');
      expect(obj.sections[0].items[0].severity).toBe('critical');
      expect(obj.sections[0].items[0].line).toBe(10);
    });
  });
  
  describe('severityColor', () => {
    test('returns correct color for each severity', () => {
      expect(severityColor('critical')).toBe('red');
      expect(severityColor('warning')).toBe('yellow');
      expect(severityColor('info')).toBe('green');
      expect(severityColor('unknown')).toBe('white');
    });
  });
  
  describe('severityIcon', () => {
    test('returns correct icon for each severity', () => {
      expect(severityIcon('critical')).toBe('🔴');
      expect(severityIcon('warning')).toBe('🟡');
      expect(severityIcon('info')).toBe('🟢');
      expect(severityIcon('unknown')).toBe('⚪');
    });
  });