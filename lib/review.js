/**
 * Parse AI review response into structured data.
 *
 * Expected input format:
 *   [Section Name]
 *   - [severity:line] description
 *   - [severity:line] description
 *
 * severity: critical | warning | info
 * line: number
 */

const SEVERITY_MAP = {
    critical: 'critical',
    warning: 'warning',
    info: 'info'
  };
  
  function parseReviewItem(line) {
    // Format: - [severity:line] description
    const match = line.match(/^-\s*\[(critical|warning|info):(\d+)\]\s*(.+)/i);
    if (!match) return null;
  
    const severity = match[1].toLowerCase();
    const lineNum = parseInt(match[2], 10);
    const text = match[3].trim();
  
    return {
      severity: SEVERITY_MAP[severity] || 'info',
      line: lineNum,
      text
    };
  }
  
  function parseReviewResponse(response) {
    const sections = [];
    let currentSection = null;
  
    if (!response || response.trim() === '') {
      return { sections };
    }
  
    const lines = response.split('\n');
  
    for (const line of lines) {
      // Section header: [Section Name]
      const headerMatch = line.match(/^\[(.+)\]$/);
      if (headerMatch && !line.startsWith('- ')) {
        currentSection = {
          name: headerMatch[1].trim(),
          items: []
        };
        sections.push(currentSection);
        continue;
      }
  
      // Item: - [severity:line] text
      if (currentSection && line.trim().startsWith('- ')) {
        const item = parseReviewItem(line);
        if (item) {
          currentSection.items.push(item);
        } else {
          // Fallback: plain item without severity/line
          const plainText = line.replace(/^-\s*/, '').trim();
          if (plainText) {
            currentSection.items.push({
              severity: 'info',
              line: null,
              text: plainText
            });
          }
        }
      }
    }
  
    return { sections };
  }
  
  function reviewToJson(file, parsedReview) {
    return JSON.stringify({
      file,
      sections: parsedReview.sections
    }, null, 2);
  }
  
  function severityColor(severity) {
    switch (severity) {
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'green';
      default: return 'white';
    }
  }
  
  function severityIcon(severity) {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🟢';
      default: return '⚪';
    }
  }
  
  module.exports = {
    parseReviewResponse,
    parseReviewItem,
    reviewToJson,
    severityColor,
    severityIcon
  };