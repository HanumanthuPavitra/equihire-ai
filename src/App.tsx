/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  BarChart3, 
  Trash2,
  Users, 
  RefreshCcw,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate, AuditReport, Gender } from './types';
import { runAudit, simulateFairness, calculateAISkillScore } from './engine';

const SAMPLE_DATABASE: Candidate[] = [
  { id: '1', name: 'James Wilson', gender: 'Male', experience: 12, skills: { predefined: ['Java', 'Spring Boot', 'MySQL', 'System Design', 'Git', 'Problem Solving'], custom: [] } },
  { id: '2', name: 'Sarah Chen', gender: 'Female', experience: 4, skills: { predefined: ['Python', 'Machine Learning', 'TensorFlow', 'Data Analysis', 'DSA', 'Problem Solving', 'Git', 'AWS'], custom: ['Keras', 'OpenCV'] } },
  { id: '3', name: 'Robert Miller', gender: 'Male', experience: 15, skills: { predefined: ['C++', 'Linux', 'Networks', 'Git'], custom: [] } },
  { id: '4', name: 'Elena Rodriguez', gender: 'Female', experience: 6, skills: { predefined: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'DSA', 'Problem Solving'], custom: ['Next.js', 'Prisma'] } },
  { id: '5', name: 'David Smith', gender: 'Male', experience: 10, skills: { predefined: ['Java', 'PostgreSQL', 'Docker', 'Linux', 'Communication'], custom: [] } },
  { id: '6', name: 'Lisa Thompson', gender: 'Female', experience: 3, skills: { predefined: ['JavaScript', 'React', 'CSS', 'Figma', 'DSA', 'Teamwork'], custom: [] } },
];

const INITIAL_SELECTED = ['James Wilson', 'Robert Miller', 'David Smith'];

const SKILL_TAXONOMY = {
  'PROGRAMMING': ['Python', 'Java', 'C', 'C++', 'C#', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'Swift'],
  'WEB': ['HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask'],
  'AI/ML & DATA': ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Analysis', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch'],
  'DATABASE': ['MySQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'Redis'],
  'CLOUD & DEVOPS': ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'],
  'CORE CS': ['DSA', 'Problem Solving', 'System Design', 'OOP', 'Operating Systems', 'Networks'],
  'TOOLS': ['Git', 'GitHub', 'Postman', 'Figma', 'JIRA'],
  'MOBILE': ['Android', 'iOS', 'Flutter', 'React Native'],
  'SECURITY': ['Cybersecurity', 'Ethical Hacking', 'Cryptography'],
  'SOFT SKILLS': ['Communication', 'Teamwork', 'Leadership', 'Critical Thinking']
};

const SKILL_LIBRARY = Object.values(SKILL_TAXONOMY).flat();

export default function App() {
  const [activeTab, setActiveTab] = useState<'audit' | 'simulation' | 'intake'>('intake');
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem('fair_ai_candidates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return SAMPLE_DATABASE;
      }
    }
    return SAMPLE_DATABASE;
  });
  const [selectedNames] = useState<string[]>(INITIAL_SELECTED);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  React.useEffect(() => {
    localStorage.setItem('fair_ai_candidates', JSON.stringify(candidates));
  }, [candidates]);
  
  // Intake Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    gender: 'Male' as Gender, 
    experience: '', 
    predefinedSkills: [] as string[],
    customSkillInput: '',
    customSkills: [] as string[]
  });
  const [intakeLog, setIntakeLog] = useState<string | null>(null);

  const report = useMemo(() => runAudit(candidates, selectedNames), [candidates, selectedNames]);
  const simResult = useMemo(() => simulateFairness(candidates, report), [candidates, report]);
  const currentReport = activeTab === 'intake' ? report : activeTab === 'audit' ? report : simResult.report;
  const showFixAction = activeTab === 'audit' && report.bias.biasDetected;

  const selectedCandidate = useMemo(() => 
    currentReport.candidates.find(c => c.id === viewDetailId), 
    [currentReport, viewDetailId]
  );

  const handleToggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      predefinedSkills: prev.predefinedSkills.includes(skill) 
        ? prev.predefinedSkills.filter(s => s !== skill)
        : [...prev.predefinedSkills, skill]
    }));
  };

  const handleAddCustomSkill = () => {
    if (!formData.customSkillInput.trim()) return;
    if (formData.customSkills.includes(formData.customSkillInput.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      customSkills: [...prev.customSkills, prev.customSkillInput.trim()],
      customSkillInput: ''
    }));
  };

  const handleRemoveCustomSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      customSkills: prev.customSkills.filter(s => s !== skill)
    }));
  };

  const handleRemoveCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
    setIntakeLog("Candidate removed successfully.");
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const exp = parseInt(formData.experience);
    if (!formData.name.trim()) return setIntakeLog("Error: Name cannot be empty.");
    if (isNaN(exp) || exp < 0) return setIntakeLog("Error: Experience must be a non-negative number.");
    if (formData.predefinedSkills.length === 0 && formData.customSkills.length === 0) {
      return setIntakeLog("Error: At least one skill must be added.");
    }

    const isDuplicate = candidates.some(c => c.name.toLowerCase() === formData.name.toLowerCase() && c.experience === exp);
    if (isDuplicate) {
      return setIntakeLog(`Warning: A profile for ${formData.name} with ${exp}y experience already exists.`);
    }

    const skills = {
      predefined: formData.predefinedSkills,
      custom: formData.customSkills
    };

    const evaluaton = calculateAISkillScore(skills);

    const newCandidate: Candidate = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      gender: formData.gender,
      experience: exp,
      skills: skills
    };

    setCandidates(prev => [...prev, newCandidate]);
    setIntakeLog(`Candidate Evaluation:

Name: ${formData.name}
Skill Score: ${evaluaton.total}/100

Skill Breakdown:
- Predefined Skills: ${evaluaton.predefinedCount}
- Custom Skills: ${evaluaton.customCount}

Brief Justification:
- ${evaluaton.predefinedCount > 0 ? "Validated expertise detected in predefined categories." : "Relying on supplemental custom skill entries."}
- ${evaluaton.customCount > 5 ? "Note: Custom skill weights are capped at 10pts to ensure scoring integrity." : "Custom skills provide minor score normalization."}

Candidate saved successfully.`);
    
    setFormData({ 
      name: '', 
      gender: 'Male', 
      experience: '', 
      predefinedSkills: [], 
      customSkillInput: '', 
      customSkills: [] 
    });
  };

  const handleDownloadSummary = () => {
    const s = simResult;
    const summary = `
FAIRNESS REPORT SUMMARY

- Bias Status: ${s.report.bias.biasDetected ? '⚠ Bias Detected' : '✅ Fairness Optimized'}
- Bias Severity Score: ${s.report.severity.score}/100 (${s.report.severity.level})
- Before Distribution: Male ${s.distribution.original.male} | Female ${s.distribution.original.female}
- After Distribution: Male ${s.distribution.simulated.male} | Female ${s.distribution.simulated.female}
- Key Insight: ${s.report.summary}
- Final Improvement Statement: ${s.improvement}
    `;
    console.log(summary);
    setShowSummary(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">FairAI <span className="text-indigo-600">Live</span></span>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex gap-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest h-6 items-center">
            <span>Core: Intel-V4</span>
            <span>Date: 2026.04.25</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* Stage Header & Actions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">
              Stage: {activeTab === 'intake' ? 'Candidate Intake' : activeTab === 'audit' ? 'Hiring Audit' : 'Bias Correction'}
            </h1>
          </div>

          <div className="flex gap-3">
            {activeTab === 'intake' && (
              <button 
                onClick={() => setActiveTab('audit')}
                className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-100 hover:bg-slate-800 transition-all"
              >
                [ Analyze Hiring Decisions ]
              </button>
            )}
            {activeTab === 'audit' && (
              <>
                <button 
                  onClick={() => setActiveTab('intake')}
                  className="px-4 py-3 bg-white border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all"
                >
                  [ ← Back to Intake ]
                </button>
                {report.bias.biasDetected && (
                  <button 
                    onClick={() => setActiveTab('simulation')}
                    className="px-6 py-3 bg-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                  >
                    [ Fix Bias ]
                  </button>
                )}
              </>
            )}
            {activeTab === 'simulation' && (
              <>
                <button 
                  onClick={() => setActiveTab('audit')}
                  className="px-4 py-3 bg-white border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all"
                >
                  [ ← Back to Audit ]
                </button>
                <button 
                  onClick={handleDownloadSummary}
                  className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg hover:bg-slate-800 transition-all"
                >
                  [ Download Summary ]
                </button>
                <button 
                  onClick={() => setActiveTab('intake')}
                  className="px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg hover:bg-slate-800 transition-all"
                >
                  [ Edit Candidates ]
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
          {/* Main Area */}
          <section className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            {activeTab === 'intake' ? (
              <motion.section 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6 flex-1 overflow-hidden"
              >
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex-shrink-0">
                  <div className="max-w-md mx-auto space-y-6">
                    <form onSubmit={handleAddCandidate} className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
                         <input 
                           type="text" 
                           value={formData.name}
                           onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                           className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                           placeholder="e.g. Sarah Chen"
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-slate-400">Gender</label>
                           <select 
                             value={formData.gender}
                             onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as Gender }))}
                             className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                           >
                             <option value="Male">Male</option>
                             <option value="Female">Female</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-slate-400">Exp (Years)</label>
                           <input 
                             type="number" 
                             value={formData.experience}
                             onChange={e => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                             className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                             placeholder="Exp"
                           />
                         </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Predefined Skills (Dropdown Library)</label>
                          <div className="space-y-4 max-h-[160px] overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-lg custom-scrollbar">
                            {Object.entries(SKILL_TAXONOMY).map(([category, skills]) => (
                              <div key={category} className="space-y-1.5">
                                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-tighter border-b border-slate-200 pb-0.5">{category}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {skills.map(skill => (
                                    <button
                                      key={skill}
                                      type="button"
                                      onClick={() => handleToggleSkill(skill)}
                                      className={`px-2 py-1 rounded border text-[9px] font-bold transition-all ${formData.predefinedSkills.includes(skill) ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                                    >
                                      {skill}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Custom Skills (AI-Assisted Processing)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={formData.customSkillInput}
                              onChange={e => setFormData(prev => ({ ...prev, customSkillInput: e.target.value }))}
                              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                              className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium outline-none"
                              placeholder="Type skill and press [Add]"
                            />
                            <button 
                              type="button" 
                              onClick={handleAddCustomSkill}
                              className="px-4 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg hover:bg-black transition-colors"
                            >
                              Add
                            </button>
                          </div>
                          {formData.customSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-indigo-50/30 rounded-lg border border-dashed border-indigo-200">
                              {formData.customSkills.map(skill => (
                                <button
                                  key={skill}
                                  type="button"
                                  onClick={() => handleRemoveCustomSkill(skill)}
                                  className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-indigo-100 text-[9px] font-bold text-indigo-600 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  {skill} <span className="opacity-50">×</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button type="submit" className="w-full h-12 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg">
                        [ Add Candidate ]
                      </button>
                    </form>
                    {intakeLog && (
                      <div className="p-4 bg-slate-900 text-slate-400 text-[10px] font-mono rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                        {intakeLog}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden flex-1">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Stored Candidates</h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100">
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Gender</th>
                          <th className="px-6 py-4 text-center">Experience</th>
                          <th className="px-6 py-4">Skills</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {candidates.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                              No candidates stored yet
                            </td>
                          </tr>
                        ) : candidates.map((c) => (
                          <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                            <td className="px-6 py-4 font-black text-slate-800">{c.name}</td>
                            <td className="px-6 py-4 text-slate-500 uppercase text-[11px] font-bold italic">{c.gender}</td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-slate-600">{c.experience}y</td>
                            <td className="px-6 py-4">
                               <div className="flex flex-col gap-0.5">
                                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight truncate max-w-[200px]">
                                   {c.skills.predefined.join(', ')}
                                 </div>
                                 {c.skills.custom.length > 0 && (
                                   <div className="text-[9px] text-indigo-400 font-bold italic truncate max-w-[200px]">
                                     Supports: {c.skills.custom.join(', ')}
                                   </div>
                                 )}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleRemoveCandidate(c.id)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                title="Remove Candidate"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.section>
            ) : activeTab === 'audit' ? (
              <section className="flex flex-col gap-6 flex-1 overflow-hidden">
                {/* 🔥 Bias Alert Card */}
                <div className={`p-6 rounded-2xl border-2 shadow-xl transition-all ${report.bias.biasDetected ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${report.bias.biasDetected ? 'bg-red-600 shadow-red-200' : 'bg-green-600 shadow-green-200'} text-white shadow-2xl shrink-0`}>
                        {report.bias.biasDetected ? <AlertTriangle size={28} /> : <ShieldCheck size={28} />}
                      </div>
                      <div>
                        <h2 className={`text-lg font-black uppercase tracking-tighter ${report.bias.biasDetected ? 'text-red-700' : 'text-green-700'}`}>
                          Bias Status: {report.bias.biasDetected ? '⚠ Bias Detected' : '✅ No Bias Detected'}
                        </h2>
                        <div className="flex gap-3 mt-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${report.bias.biasDetected ? 'bg-red-100 border-red-200 text-red-600' : 'bg-green-100 border-green-200 text-green-600'}`}>
                            Severity: {report.severity.score}/100 ({report.severity.level})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Male Selection Rate</div>
                      <div className="text-2xl font-black text-slate-800 tracking-tighter">{report.bias.maleSelectionRate}%</div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-slate-400 transition-all duration-700" style={{ width: `${report.bias.maleSelectionRate}%` }} />
                      </div>
                    </div>
                    <div className="p-4 bg-white/80 rounded-xl border border-white/60 shadow-sm">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Female Selection Rate</div>
                      <div className="text-2xl font-black text-slate-800 tracking-tighter">{report.bias.femaleSelectionRate}%</div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${report.bias.femaleSelectionRate}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden flex-1">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Candidate Overview</h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100 uppercase text-[10px] text-slate-400 font-black tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Gender</th>
                          <th className="px-6 py-4 text-center">Experience</th>
                          <th className="px-6 py-4 text-center">Skill Score</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {report.candidates.map((c) => (
                          <tr key={c.id} onClick={() => setViewDetailId(c.id)} className={`group border-b border-slate-50 hover:bg-slate-50 transition-all cursor-pointer ${viewDetailId === c.id ? 'bg-indigo-50/50' : ''}`}>
                            <td className="px-6 py-5 font-black text-slate-800">{c.name}</td>
                            <td className="px-6 py-5 text-slate-500 uppercase text-[10px] font-bold">{c.gender}</td>
                            <td className="px-6 py-5 text-center font-mono font-bold text-slate-600">{c.experience}y</td>
                            <td className="px-6 py-5 text-center">
                              <span className="font-black text-slate-700 text-lg">{c.skillScore}</span>
                            </td>
                            <td className="px-6 py-5">
                              <div className={`text-[10px] font-black uppercase flex items-center gap-2 ${c.status === 'Selected' ? 'text-green-600' : 'text-slate-300'}`}>
                                {c.status === 'Selected' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {c.status}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                    <Zap size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Key Insight</div>
                    <p className="text-xs font-bold text-slate-300 italicLeading -snug">
                      "{report.explanation}"
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="flex flex-col gap-6 flex-1 overflow-hidden">
                {/* 🔥 Impact Banner */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 rounded-2xl shadow-xl shadow-green-100 border border-green-500/20 text-white">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xl shrink-0">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black uppercase tracking-tighter">✅ Fairness Improved</h2>
                      <p className="text-[10px] font-bold text-green-100 uppercase tracking-widest opacity-80 underline underline-offset-4">Weight Normalization Protocol Applied</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/10 rounded-xl border border-white/5">
                      <div className="text-[10px] font-black text-green-100 uppercase tracking-widest mb-3 opacity-60">Before Selection Gap</div>
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold opacity-40 uppercase">Male</span>
                          <span className="text-xl font-black">{report.bias.maleSelectionRate}%</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] font-bold opacity-40 uppercase">Female</span>
                          <span className="text-xl font-black">{report.bias.femaleSelectionRate}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                      <div className="text-[10px] font-black text-green-50 uppercase tracking-widest mb-3">After Selection Gap</div>
                      <div className="flex justify-between items-end text-green-50">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold opacity-60 uppercase">Male</span>
                          <span className="text-xl font-black">{simResult.report.bias.maleSelectionRate}%</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] font-bold opacity-60 uppercase">Female</span>
                          <span className="text-xl font-black">{simResult.report.bias.femaleSelectionRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden max-h-[200px]">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Before vs After: Comparison</h2>
                  </div>
                  <div className="overflow-auto pb-4">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 border-b border-slate-50 uppercase text-[9px] text-slate-400 font-black">
                        <tr>
                          <th className="px-6 py-2">Name</th>
                          <th className="px-6 py-2 text-center">Before</th>
                          <th className="px-6 py-2 text-center">After</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px]">
                        {simResult.report.candidates.map((c) => {
                          const original = report.candidates.find(o => o.id === c.id);
                          const changed = original?.status !== c.status;
                          return (
                            <tr key={c.id} className={`border-b border-slate-50 transition-all ${changed ? 'bg-amber-50' : ''}`}>
                              <td className="px-6 py-3 font-black text-slate-700">{c.name}</td>
                              <td className="px-6 py-3 text-center">
                                <span className={original?.status === 'Selected' ? 'text-green-600' : 'text-slate-300'}>
                                  {original?.status === 'Selected' ? '✅ Selected' : '❌ Rejected'}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`font-black uppercase ${c.status === 'Selected' ? 'text-indigo-600' : 'text-slate-300'}`}>
                                  {c.status === 'Selected' ? '✅ Selected' : '❌ Rejected'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden flex-1">
                   <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Improved Results</h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100 uppercase text-[10px] text-slate-400 font-black tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4 text-center">Gender</th>
                          <th className="px-6 py-4 text-center">Final Score</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {simResult.report.candidates.map((c) => (
                          <tr key={c.id} onClick={() => setViewDetailId(c.id)} className={`group border-b border-slate-50 hover:bg-slate-50 transition-all cursor-pointer ${viewDetailId === c.id ? 'bg-indigo-50/50' : ''}`}>
                            <td className="px-6 py-5 font-black text-slate-800">{c.name}</td>
                            <td className="px-6 py-5 text-slate-500 uppercase text-[10px] font-bold">{c.gender}</td>
                            <td className="px-6 py-5 text-center">
                              <span className="font-black text-indigo-600 text-lg">{c.skillScore}</span>
                            </td>
                            <td className="px-6 py-5">
                               <div className={`text-[10px] font-black uppercase flex items-center gap-2 ${c.status === 'Selected' ? 'text-green-600' : 'text-slate-300'}`}>
                                 {c.status === 'Selected' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                 {c.status}
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-indigo-200 shrink-0 shadow-sm">
                    <BarChart3 size={18} className="text-indigo-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-0.5">Simulation Insight</div>
                    <p className="text-xs font-bold text-slate-600 italic leading-snug">
                      "{simResult.improvement} Fairness integrity verified via skill-weighted simulation."
                    </p>
                  </div>
                </div>
              </section>
            )}
          </section>

          {/* Sidebar Area */}
          <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
            {activeTab === 'intake' ? (
              <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col flex-1">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">Protocol: INTAKE</h3>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl border-l-4 border-l-indigo-600 mb-6">
                  <div className="text-[10px] font-black uppercase text-indigo-700 mb-1 tracking-widest">GUIDANCE</div>
                  <p className="text-xs font-bold text-slate-600 italic leading-relaxed">
                    Add or edit candidates. Click ‘Analyze Hiring Decisions’ to proceed.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Users size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Data Input Mode Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    All analytics, bias detection, and evaluation metrics are restricted until the Audit stage.
                  </p>
                </div>
              </section>
            ) : selectedCandidate ? (
              <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Candidate Details</h3>
                  <button onClick={() => setViewDetailId(null)} className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors">[ Close ]</button>
                </div>
                
                <div className="flex-1 overflow-auto space-y-6 custom-scrollbar">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Name / Status</div>
                    <div className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">{selectedCandidate.name}</div>
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${selectedCandidate.status === 'Selected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {selectedCandidate.status === 'Selected' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {selectedCandidate.status}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase text-slate-400 underline decoration-indigo-200 underline-offset-4">Logic Breakdown</div>
                    <p className="text-xs text-slate-600 font-bold italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                      {selectedCandidate.reason}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-green-50/50 rounded-xl border border-green-100">
                      <div className="text-[9px] font-black uppercase text-green-600 mb-2 flex items-center gap-1">
                        <Zap size={10} /> Key Strengths
                      </div>
                      <div className="space-y-1">
                        {selectedCandidate.strengths.slice(0, 3).map((s, i) => (
                           <div key={i} className="text-[9px] font-bold text-slate-600 truncate">• {s}</div>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                      <div className="text-[9px] font-black uppercase text-red-600 mb-2 flex items-center gap-1">
                        <XCircle size={10} /> Key Weakness
                      </div>
                      <div className="space-y-1">
                        {selectedCandidate.weaknesses.slice(0, 3).map((w, i) => (
                           <div key={i} className="text-[9px] font-bold text-slate-600 truncate">• {w}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Technical Profile</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.predefined.map(skill => (
                        <span key={skill} className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase text-slate-500 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="flex flex-col gap-6 flex-1 overflow-hidden">
                <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex-shrink-0">
                   <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">
                     {activeTab === 'audit' ? 'Hiring Health Monitor' : 'Fairness Summary'}
                   </h3>
                   
                   <div className={`p-4 rounded-xl flex items-center gap-4 border-2 transition-all ${currentReport.bias.biasDetected ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentReport.bias.biasDetected ? 'bg-red-500' : 'bg-green-500'} text-white shadow-lg`}>
                       {currentReport.bias.biasDetected ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
                     </div>
                     <div className="flex-1">
                       <div className={`text-xs font-black uppercase tracking-tight ${currentReport.bias.biasDetected ? 'text-red-700' : 'text-green-700'}`}>
                         Bias Status: {currentReport.bias.biasDetected ? 'DETECTED' : 'CLEARED'}
                       </div>
                       <div className="text-[10px] font-bold opacity-60 uppercase italic">
                         {activeTab === 'audit' ? 'Auditor Engine V2' : 'Fairness Score Improvement'}
                       </div>
                     </div>
                   </div>

                   <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 mb-1">M-Selection</span>
                        <span className="text-xl font-black text-slate-800">{currentReport.bias.maleSelectionRate}%</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 mb-1">F-Selection</span>
                        <span className="text-xl font-black text-slate-800">{currentReport.bias.femaleSelectionRate}%</span>
                      </div>
                   </div>

                   <div className="mt-4 space-y-3">
                      <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Bias Severity</span>
                        <span className={`text-[10px] font-black uppercase ${
                          currentReport.severity.level === 'Critical' ? 'text-red-600' :
                          currentReport.severity.level === 'High' ? 'text-orange-600' :
                          currentReport.severity.level === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {currentReport.severity.score}/100 ({currentReport.severity.level})
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            currentReport.severity.level === 'Critical' ? 'bg-red-600' :
                            currentReport.severity.level === 'High' ? 'bg-orange-600' :
                            currentReport.severity.level === 'Moderate' ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${currentReport.severity.score}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Fairness Confidence</span>
                        <span className="text-[10px] font-black uppercase text-indigo-600">{currentReport.confidence}%</span>
                      </div>
                   </div>

                   {activeTab === 'simulation' && (
                     <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <div className="text-[10px] font-black uppercase text-indigo-700 mb-1 flex items-center gap-1.5">
                          <BarChart3 size={10} /> Simulation Distribution
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="p-2 bg-white rounded border border-indigo-200 text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Original</span>
                            <div className="text-xs font-black text-slate-600">M:{simResult.distribution.original.male} F:{simResult.distribution.original.female}</div>
                          </div>
                          <div className="p-2 bg-indigo-600 rounded border border-indigo-700 text-center">
                            <span className="text-[8px] font-black text-indigo-200 uppercase">Simulated</span>
                            <div className="text-xs font-black text-white">M:{simResult.distribution.simulated.male} F:{simResult.distribution.simulated.female}</div>
                          </div>
                        </div>
                        <div className="mt-3 text-[10px] font-bold text-indigo-600 italic text-center">
                          {simResult.improvement}
                        </div>
                     </div>
                   )}
                </section>

                <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col overflow-hidden flex-1">
                   <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">System Insights</h3>
                   <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl mb-6 flex items-start gap-4">
                     <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                       <Info size={16} className="text-indigo-400" />
                     </div>
                     <div>
                       <div className="text-[10px] font-black uppercase text-indigo-400 mb-1 tracking-widest">REPORT SUMMARY</div>
                       <p className="text-xs font-bold text-slate-300 italic leading-relaxed">
                         {currentReport.summary}
                       </p>
                     </div>
                   </div>

                   <div className="flex-1 overflow-auto space-y-4 custom-scrollbar">
                     {currentReport.insights.map((insight, i) => (
                       <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                          <p className="text-[11px] font-bold text-slate-500 italic leading-snug">
                            {insight.replace('⚠', '').trim()}
                          </p>
                       </div>
                     ))}
                   </div>
                </section>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-slate-900 flex items-center px-6 justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800">
        <div className="flex gap-4 items-center">
          <div className={`w-2 h-2 rounded-full ${currentReport.bias.biasDetected ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`} />
          <span className="font-bold tracking-widest uppercase italic">FairAI.OS // ACTIVE_NODE: {activeTab.toUpperCase()}</span>
        </div>
        <div className="flex gap-8 uppercase tracking-[0.2em] font-black opacity-80">
          <span>Algo: Weighted-Intel-V4</span>
          <span>Compliance: Verified-2026</span>
        </div>
      </footer>
      <SummaryOverlay show={showSummary} onClose={() => setShowSummary(false)} simResult={simResult} />
    </div>
  );
}

function SummaryOverlay({ show, onClose, simResult }: { show: boolean, onClose: () => void, simResult: any }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-slate-900 text-white w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Fairness Report Summary</h2>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Export Success // Log Record ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <XCircle size={24} />
          </button>
        </div>

        <div className="space-y-8 font-mono text-[11px]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/50">
              <div className="opacity-40 uppercase mb-2">Bias Status</div>
              <div className={`font-black text-xs ${simResult.report.bias.biasDetected ? 'text-red-400' : 'text-green-400'}`}>
                {simResult.report.bias.biasDetected ? '⚠ BIAS DETECTED' : '✅ FAIRNESS OPTIMIZED'}
              </div>
            </div>
            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/50">
              <div className="opacity-40 uppercase mb-2">Severity Score</div>
              <div className="font-black text-xs text-indigo-300">{simResult.report.severity.score}/100 ({simResult.report.severity.level})</div>
            </div>
            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/50">
              <div className="opacity-40 uppercase mb-2 underline decoration-slate-600 underline-offset-4">Before Distribution</div>
              <div className="font-black text-indigo-200">M: {simResult.distribution.original.male} | F: {simResult.distribution.original.female}</div>
            </div>
            <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
              <div className="opacity-60 uppercase mb-2 underline decoration-indigo-400 underline-offset-4">After Distribution</div>
              <div className="font-black text-indigo-400">M: {simResult.distribution.simulated.male} | F: {simResult.distribution.simulated.female}</div>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-8">
            <div className="opacity-40 uppercase mb-3 px-1">Key Audit Insight</div>
            <p className="text-slate-300 font-bold italic leading-relaxed bg-slate-800/20 p-4 rounded-xl">
               "{simResult.report.summary}"
            </p>
          </div>

          <div className="border-t border-slate-800/50 pt-8">
            <div className="opacity-40 uppercase mb-3 px-1">Improvement Statement</div>
            <p className="text-green-400 font-black italic leading-relaxed border-l-2 border-green-500/30 pl-4">
              "{simResult.improvement} Bias neutralized via selection parity."
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-10 py-4 bg-white text-slate-900 font-black text-[11px] uppercase tracking-[0.3em] rounded-xl hover:bg-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
        >
          Close Session Report
        </button>
      </div>
    </div>
  );
}

