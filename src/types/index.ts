export type RemoteType = 'remote' | 'hybrid' | 'onsite' | 'unknown';
export type ATSType = 'greenhouse' | 'lever' | 'workday' | 'linkedin' | 'generic';
export type SeniorityMatch = 'perfect' | 'stretch' | 'overqualified';
export type ApplyRecommendation = 'apply' | 'skip' | 'reach_out_first';

export type ApplicationStatus =
  | 'discovered' | 'scored' | 'queued' | 'cover_letter_ready'
  | 'applying' | 'applied' | 'viewed' | 'interview' | 'rejected' | 'offer';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyDomain?: string;
  location?: string;
  remoteType: RemoteType;
  salaryMin?: number;
  salaryMax?: number;
  jobUrl: string;
  atsType?: ATSType;
  jdRaw?: string;
  jdSummary?: string;
  postedAt?: string;
  discoveredAt: string;

  // Scoring
  fitScore?: number;
  skillsMatch?: number;
  seniorityMatch?: SeniorityMatch;
  domainMatch?: number;
  redFlags?: string[];
  greenFlags?: string[];
  talkingPoints?: string[];
  applyRecommendation?: ApplyRecommendation;
  scoredAt?: string;

  // Research
  companySummary?: string;
  companySize?: string;
  fundingStage?: string;
  recentNews?: Array<{ title: string; url: string; date: string }>;
  glassdoorRating?: number;
  researchedAt?: string;

  // Application
  status: ApplicationStatus;
  coverLetter?: string;
  tailoredResumePath?: string;
  appliedAt?: string;
  followUpAt?: string;
  notes?: string;
}

export interface FitScoreResult {
  overall: number;
  skillsMatch: number;
  seniorityMatch: SeniorityMatch;
  domainMatch: number;
  redFlags: string[];
  greenFlags: string[];
  talkingPoints: string[];
  applyRecommendation: ApplyRecommendation;
  reasoning: string;
}

export interface UserPreferences {
  targetRoles: string[];
  targetLevel: string;
  targetSalaryMin: number;
  remotePreference: RemoteType;
  targetLocations: string[];
  targetDomains: string[];
  excludeCompanies: string[];
  minFitScore: number;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  portfolioUrl: string;
  workAuthorization: string;
  yearsOfExperience: number;
  currentCompany: string;
  currentTitle: string;
  salaryExpectation?: string;
  startDate: string;
}

export interface FormField {
  label: string;
  selectorHint: string;
  fieldType: 'text' | 'textarea' | 'select' | 'file' | 'checkbox';
  value: string;
  required: boolean;
}

export interface ApplicationData {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  portfolioUrl: string;
  workAuthorization: string;
  yearsOfExperience: number;
  currentCompany: string;
  currentTitle: string;
  resumeFilePath: string;
  coverLetterText: string;
  salaryExpectation: string;
  startDate: string;
}

export interface CompanyResearch {
  companySummary: string;
  companySize: string;
  fundingStage: string;
  recentNews: Array<{ title: string; url: string; date: string }>;
  glassdoorRating?: number;
}

export interface DiscoveredJob {
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  postedAt?: string;
  jdRaw?: string;
  atsType: ATSType;
  remoteType: RemoteType;
  salaryMin?: number;
  salaryMax?: number;
  companyDomain?: string;
}
