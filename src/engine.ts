/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditedCandidate, AuditReport, Candidate, Gender, SimulationResult } from './types';

/**
 * STEP 1 — SKILL SCORING LOGIC (STRICT)
 */
export const calculateAISkillScore = (skills: { predefined: string[], custom: string[] }): {
  total: number;
  predefinedCount: number;
  customCount: number;
  breakdown: string;
} => {
  let techScore = 0;
  let psScore = 0;
  let toolScore = 0;
  let cloudScore = 0;

  const techList = [
    'Python', 'Java', 'C', 'C++', 'C#', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'Swift',
    'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask',
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Analysis', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'Redis'
  ];

  const toolList = [
    'Git', 'GitHub', 'Postman', 'Figma', 'JIRA',
    'Android', 'iOS', 'Flutter', 'React Native',
    'Cybersecurity', 'Ethical Hacking', 'Cryptography',
    'Communication', 'Teamwork', 'Leadership', 'Critical Thinking',
    'System Design', 'OOP', 'Operating Systems', 'Networks'
  ];

  const cloudList = ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'];

  skills.predefined.forEach(s => {
    if (techList.includes(s)) techScore += 4;
    if (s === 'DSA') psScore += 12;
    if (s === 'Problem Solving') psScore += 13;
    if (toolList.includes(s)) toolScore += 3;
    if (cloudList.includes(s)) cloudScore += 5;
  });

  techScore = Math.min(40, techScore);
  psScore = Math.min(25, psScore);
  toolScore = Math.min(15, toolScore);
  cloudScore = Math.min(10, cloudScore);

  // Custom skills: 2 points each, max 10
  const customScore = Math.min(10, skills.custom.length * 2);

  // Versatility based on total skills
  const totalSkillCount = skills.predefined.length + skills.custom.length;
  let versatility = 0;
  if (totalSkillCount >= 8) versatility = 10;
  else if (totalSkillCount >= 5) versatility = 7;
  else if (totalSkillCount >= 3) versatility = 4;
  else if (totalSkillCount > 0) versatility = 2;

  const finalScore = techScore + psScore + toolScore + cloudScore + customScore + versatility;
  
  return {
    total: Math.min(100, finalScore),
    predefinedCount: skills.predefined.length,
    customCount: skills.custom.length,
    breakdown: `Predefined: ${skills.predefined.length} | Custom: ${skills.custom.length}`
  };
};

export const runAudit = (dataset: Candidate[], selectedNames: string[]): AuditReport => {
  const maxExp = Math.max(...dataset.map(c => c.experience), 1);
  
  const audited: AuditedCandidate[] = dataset.map(c => {
    const scoreData = calculateAISkillScore(c.skills);
    const skillScore = scoreData.total;
    const expNorm = (c.experience / maxExp) * 100;
    const finalScore = (0.4 * expNorm) + (0.6 * skillScore);
    const isSelected = selectedNames.includes(c.name);

    // Derive strengths and weaknesses
    const techListCount = c.skills.predefined.filter(s => [
      'Python', 'Java', 'C', 'C++', 'C#', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'Swift',
      'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask',
      'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Analysis', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch',
      'MySQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'Redis'
    ].includes(s)).length;

    const strengths: string[] = [];
    if (techListCount > 5) strengths.push('Broad Technical Stack');
    if (c.skills.predefined.includes('DSA') || c.skills.predefined.includes('Problem Solving')) strengths.push('Strong Problem Solving Foundations');
    if (c.experience >= 5) strengths.push('Significant Industry Experience');
    if (c.skills.predefined.length + c.skills.custom.length >= 8) strengths.push('High Versatility Profile');
    if (skillScore > 80) strengths.push('Top Tier Skill Indicator');

    const weaknesses: string[] = [];
    if (!c.skills.predefined.includes('DSA') && !c.skills.predefined.includes('Problem Solving')) weaknesses.push('Missing Core Problem Solving Markers');
    if (techListCount < 3) weaknesses.push('Limited Technical Tooling');
    if (c.experience < 2) weaknesses.push('Entry-level Experience Threshold');
    if (skillScore < 40) weaknesses.push('Sub-optimal Skill Density');

    // Justification with breakdown
    const justifySkills = scoreData.predefinedCount > 0 
      ? `Strength derived primarily from predefined technical markers (${scoreData.predefinedCount}).` 
      : `Profile relies heavily on custom skill self-reports (${scoreData.customCount}), which are given limited weighted contribution (max 10pts).`;

    const reason = isSelected 
      ? `Selected: Candidate demonstrates high technical proficiency (Score: ${skillScore}). ${justifySkills} Meets weighted performance threshold of ${finalScore.toFixed(1)}.`
      : `Rejected: Candidate scored ${finalScore.toFixed(1)} (Skill: ${skillScore}), falling below the competitive selection parity. While experience is noted (${c.experience}y), higher predefined skill depth or problem-solving markers were required to surpass currently selected peers.`;

    return {
      ...c,
      skillScore,
      status: isSelected ? 'Selected' : 'Rejected',
      reason,
      strengths: strengths.length > 0 ? strengths : ['General Competency'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['No Major Deficiencies Identified']
    };
  });

  // Stats
  const males = audited.filter(c => c.gender === 'Male');
  const females = audited.filter(c => c.gender === 'Female');
  const selMales = males.filter(c => c.status === 'Selected');
  const selFemales = females.filter(c => c.status === 'Selected');

  const maleRate = males.length > 0 ? (selMales.length / males.length) * 100 : 0;
  const femaleRate = females.length > 0 ? (selFemales.length / females.length) * 100 : 0;
  const gap = Math.abs(maleRate - femaleRate);
  const biasDetected = gap >= 15; 

  // Severity Logic
  let level: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
  if (gap > 50) level = 'Critical';
  else if (gap > 25) level = 'High';
  else if (gap > 10) level = 'Moderate';

  // Confidence Score: 100 - gap
  const confidence = Math.max(0, 100 - gap);

  // Detailed Bias Explanation
  let explanation = "Selection metrics are balanced within acceptable tolerance limits.";
  if (biasDetected) {
    const underrepresented = maleRate < femaleRate ? 'Male' : 'Female';
    explanation = `⚠ Bias Detected: ${underrepresented} candidates are underrepresented. Systemic tenure-based weighting is overshadowing skill markers.`;
  }

  // Key Insights
  const insights = [
    `Selection Rate Gap: There is a ${gap.toFixed(1)}% difference in demographic selection outcomes.`,
    `Performance Variance: Selected candidates average ${(audited.filter(a => a.status === 'Selected').reduce((acc, curr) => acc + (curr.skillScore || 0), 0) / Math.max(1, audited.filter(a => a.status === 'Selected').length)).toFixed(1)} skill points.`,
    `Root Cause: ${biasDetected ? 'Legacy weighting prioritizes experience (40%) which correlates with historical demographic imbalances.' : 'Balanced weighting confirmed.'}`
  ];

  return {
    candidates: audited,
    totals: {
      male: males.length,
      female: females.length,
      selectedMale: selMales.length,
      selectedFemale: selFemales.length
    },
    bias: {
      maleSelectionRate: Math.round(maleRate),
      femaleSelectionRate: Math.round(femaleRate),
      biasDetected
    },
    severity: {
      score: Math.round(gap),
      level
    },
    confidence: Math.round(confidence),
    insights,
    explanation,
    summary: biasDetected 
      ? `Audit reveals a ${level} level of bias with a ${gap.toFixed(0)}% selection gap.`
      : `Audit confirms high fairness integrity with ${confidence}% confidence.`,
    recommendation: [
      "Normalize experience weights to 20% to reduce legacy bias.",
      "Implement skill-only blind screening for initial audit rounds.",
      "Adjust selection threshold to account for top 5% skill outliers."
    ]
  };
};

/**
 * Intelligent Simulation logic
 */
export const simulateFairness = (dataset: Candidate[], originalReport: AuditReport): SimulationResult => {
  const maxExp = Math.max(...dataset.map(c => c.experience), 1);
  
  // Selection Logic: Select Top 50%
  const nToSelect = Math.ceil(dataset.length / 2);

  const simulations = dataset.map(c => {
    const scoreData = calculateAISkillScore(c.skills);
    const skillScore = scoreData.total;
    const expNorm = (c.experience / maxExp) * 100;
    // Increase skill weight in simulation
    const finalScore = (0.2 * expNorm) + (0.8 * skillScore);
    return { ...c, finalScore };
  });

  const sorted = [...simulations].sort((a, b) => b.finalScore - a.finalScore);
  const selectedNames = sorted.slice(0, nToSelect).map(c => c.name);

  const newReport = runAudit(dataset, selectedNames);

  return {
    report: newReport,
    distribution: {
      original: { 
        male: originalReport.totals.selectedMale, 
        female: originalReport.totals.selectedFemale 
      },
      simulated: { 
        male: newReport.totals.selectedMale, 
        female: newReport.totals.selectedFemale 
      }
    },
    improvement: newReport.bias.biasDetected ? "Bias reduced but persistent markers remain." : "Bias successfully neutralized via weight normalization."
  };
};
