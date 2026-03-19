import { Link } from 'react-router-dom'
import { BriefcaseBusiness, Chrome, ExternalLink, Linkedin, MapPin, MessageSquare, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CandidateAvatar from '@/components/CandidateAvatar'

const experience = [
  {
    role: 'Senior Product Designer',
    company: 'Bloomreach',
    period: 'Jan 2024 - Present',
    detail: 'Leading onboarding redesign, activation UX, and product/engineering collaboration for enterprise accounts.',
  },
  {
    role: 'Independent Product Consultant',
    company: 'Freelance',
    period: 'May 2023 - Apr 2024',
    detail: 'Worked with early-stage SaaS teams on growth experiments, design systems, and user research.',
  },
  {
    role: 'Product Designer',
    company: 'Kiwi.com',
    period: 'Jun 2020 - Apr 2023',
    detail: 'Owned booking flow improvements, support experience redesign, and mobile conversion experiments.',
  },
]

const education = [
  {
    school: 'Comenius University Bratislava',
    degree: 'Computer Science',
    period: '2017 - 2019',
  },
  {
    school: 'Google UX Design Certificate',
    degree: 'Professional Certificate',
    period: '2020',
  },
]

const skills = ['Product Design', 'User Research', 'Figma', 'Design Systems', 'A/B Testing', 'PLG', 'Workshop Facilitation', 'Cross-functional Leadership']

export default function ProfileMockup() {
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <header className="border-b border-[#d9d9d9] bg-white">
        <div className="mx-auto flex max-w-[1128px] items-center gap-3 px-4 py-2">
          <div className="flex items-center gap-2 text-[#0a66c2]">
            <Linkedin size={34} fill="currentColor" />
          </div>
          <div className="flex max-w-[280px] flex-1 items-center gap-2 rounded-md bg-[#edf3f8] px-3 py-2 text-sm text-slate-500">
            <Search size={16} />
            Search
          </div>
          <nav className="ml-auto hidden items-center gap-7 text-xs text-slate-500 md:flex">
            <div className="flex flex-col items-center gap-1">
              <Users size={18} />
              <span>Network</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <BriefcaseBusiness size={18} />
              <span>Jobs</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <MessageSquare size={18} />
              <span>Messaging</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1128px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-[#d9d9d9] bg-white">
            <div className="h-[132px] bg-[linear-gradient(120deg,#0a66c2,#4da1f4_60%,#79b8f9)]" />
            <div className="px-6 pb-6">
              <div className="-mt-[64px]">
                <CandidateAvatar name="Nina Vargova" className="h-[128px] w-[128px] border-4 border-white shadow-sm" fallbackClassName="text-3xl" />
              </div>

              <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="text-[30px] font-semibold leading-8 text-[#191919]">Nina Vargova</h1>
                  <p className="mt-1 text-[18px] leading-7 text-[#191919]">Senior Product Designer at Bloomreach</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#5e5e5e]">
                    <span className="flex items-center gap-1"><MapPin size={14} />Bratislava, Slovakia</span>
                    <span>500+ connections</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-[#0a66c2]">Applied for Senior Product Designer</div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[360px] xl:justify-end">
                  <Button className="rounded-full bg-[#0a66c2] px-5 hover:bg-[#004182]">
                    Message
                  </Button>
                  <Button variant="outline" className="rounded-full border-[#0a66c2] px-5 text-[#0a66c2] hover:bg-[#eaf4ff] hover:text-[#0a66c2]">
                    Save Candidate
                  </Button>
                  <Button asChild variant="outline" className="rounded-full px-5">
                    <Link to="/extension-demo">
                      <Chrome size={14} />
                      Open TalentLens Extension
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-4 max-w-[760px] text-base leading-7 text-[#191919]">
                Product designer with 8 years of experience across SaaS, travel, and growth-focused product teams. Built onboarding systems,
                ran experiments, mentored junior designers, and partnered closely with engineering and product leadership.
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniInfo title="Current company" value="Bloomreach" />
                <MiniInfo title="Location preference" value="Bratislava / Remote" />
                <MiniInfo title="Hiring status" value="Ready for screening" />
              </div>
            </div>
          </div>

          <section className="rounded-xl border border-[#d9d9d9] bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900">About</h2>
            <div className="mt-4 text-sm leading-6 text-[#191919]">
              Senior designer focused on growth, onboarding, and product adoption. Has led cross-functional work with PMs, engineers, and researchers.
              Strong PLG background, enterprise UX exposure, and experience improving activation metrics.
            </div>
          </section>

          <section className="rounded-xl border border-[#d9d9d9] bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900">Experience</h2>
            <div className="mt-5 space-y-5">
              {experience.map((item) => (
                <div key={`${item.company}-${item.period}`} className="border-b border-[#ebebeb] pb-5 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#f3f6f8] text-sm font-semibold text-slate-700">
                      {item.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{item.role}</h3>
                      <p className="text-sm text-slate-700">{item.company}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.period}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#d9d9d9] bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900">Education</h2>
            <div className="mt-5 space-y-4">
              {education.map((item) => (
                <div key={`${item.school}-${item.period}`} className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#f3f6f8] text-sm font-semibold text-slate-700">
                    {item.school.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{item.school}</h3>
                    <p className="text-sm text-slate-700">{item.degree}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.period}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#d9d9d9] bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900">Skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="rounded-full border border-[#d9d9d9] px-3 py-1 text-sm font-medium text-slate-700">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-[#d9d9d9] bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Recruiter Notes</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Candidate applied for Senior Product Designer.</p>
              <p>Strong SaaS profile, growth/design systems overlap, and senior collaboration signals.</p>
              <p>Use TalentLens extension for the first-round AI screen before scheduling HR.</p>
            </div>
          </section>

          <section className="rounded-xl border border-[#d9d9d9] bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Application Assets</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md bg-[#f3f6f8] px-3 py-2">
                <span className="text-slate-700">CV.pdf</span>
                <span className="text-slate-500">Uploaded</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[#f3f6f8] px-3 py-2">
                <span className="text-slate-700">Portfolio</span>
                <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-[#0a66c2]">
                  Open <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[#f3f6f8] px-3 py-2">
                <span className="text-slate-700">Certificates</span>
                <span className="text-slate-500">2 files</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#d9d9d9] bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Similar Profiles</h2>
            <div className="mt-4 space-y-4">
              <SidebarPerson name="Marek Kral" role="Product Designer at Mews" />
              <SidebarPerson name="Lucia Havel" role="Senior UX Designer at Productboard" />
              <SidebarPerson name="Petra Novak" role="Lead Product Designer at Slido" />
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d9d9d9] bg-[#f9fafb] px-4 py-3">
      <div className="text-xs text-[#5e5e5e]">{title}</div>
      <div className="mt-1 text-sm font-medium text-[#191919]">{value}</div>
    </div>
  )
}

function SidebarPerson({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-start gap-3">
      <CandidateAvatar name={name} className="h-12 w-12 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#191919]">{name}</div>
        <div className="text-sm leading-5 text-[#5e5e5e]">{role}</div>
      </div>
    </div>
  )
}
