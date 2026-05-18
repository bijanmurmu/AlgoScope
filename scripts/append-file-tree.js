// scripts/append-file-tree.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the new tag from the command line argument
const tag = process.argv[2];
if (!tag) {
  console.error('No tag provided');
  process.exit(1);
}

// Get all tags sorted by commit date, newest first
function getAllTagsSorted() {
  try {
    const output = execSync('git tag --sort=-creatordate', { encoding: 'utf8' }).trim();
    if (!output) return [];
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// Build a filtered directory tree of files changed between two tags
function getChangedFilesTree(fromTag, toTag) {
  let changedFiles = [];
  try {
    if (fromTag) {
      const diffOutput = execSync(`git diff --name-status ${fromTag} ${toTag}`, { encoding: 'utf8' });
      changedFiles = diffOutput
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split('\t');
          return { status: parts[0], file: parts.slice(1).join('\t') };
        });
    } else {
      // First tag: include all files
      const allFiles = execSync('git ls-tree -r HEAD --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(f => ({ status: 'A', file: f }));
      changedFiles = allFiles;
    }
  } catch (e) {
    console.error(`Error getting changed files between ${fromTag} and ${toTag}:`, e.message);
    return '';
  }

  // Build tree object
  function buildTree(fileList) {
    const root = {};
    for (const entry of fileList) {
      const parts = entry.file.split('/');
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          if (!current[part]) {
            current[part] = { type: 'file', status: entry.status };
          }
        } else {
          if (!current[part]) {
            current[part] = { type: 'directory', children: {} };
          } else if (current[part].type !== 'directory') {
            current[part] = { type: 'directory', children: {} };
          }
          current = current[part].children;
        }
      }
    }
    return root;
  }

  function renderTree(node, indent = '') {
    let output = '';
    const entries = Object.entries(node).sort((a, b) => {
      const aIsDir = a[1].type === 'directory';
      const bIsDir = b[1].type === 'directory';
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a[0].localeCompare(b[0]);
    });

    for (const [name, info] of entries) {
      if (info.type === 'directory') {
        output += `${indent}- 📁 **${name}/**\n`;
        output += renderTree(info.children, indent + '  ');
      } else {
        let icon = '';
        if (info.status === 'A') icon = '➕ ';
        else if (info.status === 'M') icon = '✏️ ';
        else if (info.status === 'D') icon = '❌ ';
        else icon = '• ';
        output += `${indent}- ${icon}${name}\n`;
      }
    }
    return output;
  }

  if (changedFiles.length === 0) return '';
  const tree = buildTree(changedFiles);
  return renderTree(tree);
}

// Parse release-please changelog sections into the old format
function parseReleasePleaseSections(content) {
  const sections = {};
  const lines = content.split('\n');
  let currentSection = null;
  let currentEntries = [];

  for (const line of lines) {
    const headerMatch = line.match(/^### (.+)/);
    if (headerMatch) {
      if (currentSection && currentEntries.length > 0) {
        sections[currentSection] = currentEntries;
      }
      currentSection = headerMatch[1].trim();
      currentEntries = [];
    } else if (currentSection && line.trim().startsWith('*')) {
      // Extract the description and prune commit hashes
      let entry = line.replace(/^\*\s*/, '').trim();
      // Remove trailing commit reference like ([abc1234](https://...))
      entry = entry.replace(/\s*\(\[[a-f0-9]+\]\(https:\/\/github\.com\/[^\)]+\)\)\s*$/, '');
      if (entry) {
        currentEntries.push(`- ${entry}`);
      }
    }
  }

  if (currentSection && currentEntries.length > 0) {
    sections[currentSection] = currentEntries;
  }

  return sections;
}

// Map release-please section names to old format names
function mapSectionToOldFormat(sectionName) {
  const mapping = {
    'Features': 'Added',
    'Bug Fixes': 'Fixed',
    'Performance Improvements': 'Changed',
    'Documentation': 'Documentation',
    'Reverts': 'Reverted',
    'Miscellaneous': 'Changed'
  };
  return mapping[sectionName] || sectionName;
}

// Build the new CHANGELOG.md from scratch
function rebuildChangelog(allTags, newReleaseVersion) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  
  // Read the old manually maintained entries (everything after the first release-please header)
  let oldContent = '';
  if (fs.existsSync(changelogPath)) {
    oldContent = fs.readFileSync(changelogPath, 'utf8');
  }

  // Extract the old manual entries (keep them as-is if they exist)
  const oldSections = {};
  const oldVersionRegex = /^## \[(\d+\.\d+\.\d+)\](.*?)(?=^## \[|\Z)/gms;
  let oldMatch;
  while ((oldMatch = oldVersionRegex.exec(oldContent)) !== null) {
    const ver = oldMatch[1];
    const sectionContent = oldMatch[2].trim();
    oldSections[ver] = sectionContent;
  }

  // Build the new header
  let changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;

  // Process each tag in order (newest first)
  const tagsToProcess = allTags.slice(0, 5); // Limit to last 5 releases

  for (let i = 0; i < tagsToProcess.length; i++) {
    const currentTag = tagsToProcess[i];
    const version = currentTag.startsWith('v') ? currentTag.slice(1) : currentTag;
    const previousTag = i < tagsToProcess.length - 1 ? tagsToProcess[i + 1] : null;
    
    // Get commit date for this tag
    let date;
    try {
      date = execSync(`git log -1 --format=%as ${currentTag}`, { encoding: 'utf8' }).trim();
    } catch {
      date = '2026-05-18'; // fallback
    }

    changelog += `## [${version}] - ${date}\n\n`;

    // Check if this version exists in the old manual entries
    if (oldSections[version]) {
      // Use the old manual format
      changelog += oldSections[version] + '\n\n';
    } else {
      // Generate from git log between tags
      let gitLogOutput = '';
      try {
        if (previousTag) {
          gitLogOutput = execSync(
            `git log --pretty=format:"%s" ${previousTag}..${currentTag}`,
            { encoding: 'utf8' }
          ).trim();
        } else {
          gitLogOutput = execSync(
            `git log --pretty=format:"%s" ${currentTag}`,
            { encoding: 'utf8' }
          ).trim();
        }
      } catch (e) {
        console.error(`Error getting git log for ${currentTag}:`, e.message);
      }

      const commitLines = gitLogOutput.split('\n').filter(Boolean);
      const categorized = {
        'Added': [],
        'Fixed': [],
        'Changed': []
      };

      for (const line of commitLines) {
        if (line.startsWith('feat:') || line.startsWith('feat(')) {
          categorized['Added'].push(`- ${line.replace(/^feat(\([^)]+\))?:\s*/, '')}`);
        } else if (line.startsWith('fix:') || line.startsWith('fix(')) {
          categorized['Fixed'].push(`- ${line.replace(/^fix(\([^)]+\))?:\s*/, '')}`);
        } else if (line.startsWith('perf:') || line.startsWith('refactor:')) {
          categorized['Changed'].push(`- ${line.replace(/^(perf|refactor)(\([^)]+\))?:\s*/, '')}`);
        }
      }

      for (const [section, entries] of Object.entries(categorized)) {
        if (entries.length > 0) {
          changelog += `### ${section}\n\n`;
          changelog += entries.join('\n') + '\n\n';
        }
      }
    }

    // Add the file tree for this release
    const treeMarkdown = getChangedFilesTree(previousTag, currentTag);
    if (treeMarkdown) {
      changelog += `### 📂 Changed Files\n\n\`\`\`\n${treeMarkdown}\`\`\`\n\n`;
    }
  }

  return changelog;
}

// Main execution
const allTags = getAllTagsSorted();
console.log('All tags:', allTags);

const newVersion = tag.startsWith('v') ? tag.slice(1) : tag;
const newChangelog = rebuildChangelog(allTags, newVersion);

// Write the complete new changelog
const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
fs.writeFileSync(changelogPath, newChangelog, 'utf8');
console.log('CHANGELOG.md has been completely rebuilt with proper ordering.');
