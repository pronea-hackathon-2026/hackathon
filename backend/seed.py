"""
Seed the database with demo candidates, a job, and applications.
Run: python seed.py
"""
import os
import json
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

# ─── Demo Job ─────────────────────────────────────────────────────────────────
print("Creating demo job...")
from services.embeddings import embed

JOB_TITLE = "Senior Full-Stack Engineer"
JOB_DESC = """We are looking for a Senior Full-Stack Engineer to join our product team. 
You will architect and build scalable web applications using React, TypeScript, and Python/FastAPI backends. 
You need 5+ years of experience, strong TypeScript and Python skills, experience with cloud infrastructure 
(AWS or GCP), and the ability to mentor junior engineers. Bonus: experience with ML/AI integrations."""

job_embedding = embed(JOB_DESC)
job_result = db.table("jobs").insert({
    "title": JOB_TITLE,
    "description": JOB_DESC,
    "embedding": job_embedding,
}).execute()
job = job_result.data[0]
job_id = job["id"]
print(f"  Job created: {job_id}")

# ─── Demo Candidates ──────────────────────────────────────────────────────────
CANDIDATES = [
    {
        "name": "Alice Chen",
        "email": "alice.chen@email.com",
        "source": "linkedin",
        "skills": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "AWS", "Docker", "GraphQL", "Redis", "Kubernetes"],
        "experience_summary": "8 years, progressed from junior dev to tech lead at fintech startups",
        "credibility_score": 88,
        "raw_text": "Alice Chen | Senior Engineer | alice.chen@email.com | +1-555-0101\n\nSkills: React, TypeScript, Python, FastAPI, PostgreSQL, AWS, Docker, GraphQL, Redis, Kubernetes\n\nExperience:\n2021-Present: Tech Lead at PayFast (36 months)\n2019-2021: Senior Engineer at DataFlow Inc (24 months)\n2017-2019: Software Engineer at WebCraft (24 months)\n2016-2017: Junior Developer at StartupHub (12 months)\n\nEducation: B.Sc Computer Science, MIT 2016\n\nLanguages: English (native), Mandarin (fluent)",
    },
    {
        "name": "Marcus Okonkwo",
        "email": "marcus.ok@protonmail.com",
        "source": "startupjobs",
        "skills": ["Vue.js", "Node.js", "Python", "Django", "MySQL", "GCP", "Terraform"],
        "experience_summary": "6 years backend/fullstack, worked at early-stage startups",
        "credibility_score": 72,
        "raw_text": "Marcus Okonkwo | Backend Engineer | marcus.ok@protonmail.com | +44-7700-900123\n\nSkills: Vue.js, Node.js, Python, Django, MySQL, GCP, Terraform\n\nExperience:\n2020-Present: Backend Engineer at CloudMesh (48 months)\n2018-2020: Full-Stack Developer at AppFactory (24 months)\n2018-2018: Contract Developer (6 months gap before this)\n\nEducation: B.Eng Software Engineering, University of Lagos 2018\n\nLanguages: English (native), Yoruba (native)",
    },
    {
        "name": "Sofia Andersen",
        "email": "sofia.andersen@outlook.com",
        "source": "email",
        "skills": ["React", "Next.js", "TypeScript", "Go", "PostgreSQL", "Kubernetes", "Prometheus"],
        "experience_summary": "7 years, strong frontend to fullstack trajectory at scale-ups",
        "credibility_score": 82,
        "raw_text": "Sofia Andersen | Full-Stack Engineer | sofia.andersen@outlook.com | +45-20-123456\n\nSkills: React, Next.js, TypeScript, Go, PostgreSQL, Kubernetes, Prometheus\n\nExperience:\n2022-Present: Senior Engineer at ScaleNord (24 months)\n2019-2022: Frontend Lead at DesignTech (36 months)\n2017-2019: Frontend Developer at WebAgency (24 months)\n\nEducation: M.Sc Computer Science, Copenhagen University 2017\n\nLanguages: English (fluent), Danish (native), Swedish (conversational)",
    },
    {
        "name": "Raj Patel",
        "email": "raj.patel.dev@gmail.com",
        "source": "manual",
        "skills": ["React", "Angular", "Python", "Flask", "MongoDB", "Azure"],
        "experience_summary": "4 years mixed fullstack, 1 gap period between jobs",
        "credibility_score": 61,
        "raw_text": "Raj Patel | Full-Stack Developer | raj.patel.dev@gmail.com | +91-98765-43210\n\nSkills: React, Angular, Python, Flask, MongoDB, Azure\n\nExperience:\n2023-Present: Developer at TechSolve (12 months)\n2021-2022: Frontend Developer at PixelWorks (14 months) - gap after\n2019-2021: Junior Developer at CodeBase (18 months)\n\nEducation: B.Tech Information Technology, IIT Bombay 2019\n\nLanguages: English (fluent), Hindi (native), Gujarati (native)\n\nGaps: 6 months gap 2022-2023 (personal reasons)",
    },
    {
        "name": "Elena Volkov",
        "email": "elena.volkov@techmail.eu",
        "source": "linkedin",
        "skills": ["React", "TypeScript", "Python", "FastAPI", "Redis", "AWS", "Machine Learning", "PyTorch"],
        "experience_summary": "5 years, ML/AI background transitioning to fullstack engineering",
        "credibility_score": 79,
        "raw_text": "Elena Volkov | ML Engineer / Full-Stack | elena.volkov@techmail.eu | +7-916-555-0199\n\nSkills: React, TypeScript, Python, FastAPI, Redis, AWS, Machine Learning, PyTorch\n\nExperience:\n2022-Present: ML Engineer at AILabs (24 months)\n2020-2022: Data Scientist at Analytics Corp (24 months)\n2019-2020: Junior ML Engineer at DataStart (12 months)\n\nEducation: M.Sc Machine Learning, Moscow State University 2019\n\nLanguages: English (fluent), Russian (native), German (basic)",
    },
    {
        "name": "Tom Bradley",
        "email": "tombradley@icloud.com",
        "source": "startupjobs",
        "skills": ["JavaScript", "PHP", "WordPress", "MySQL", "Bootstrap"],
        "experience_summary": "3 years mostly WordPress/PHP, limited modern stack experience",
        "credibility_score": 42,
        "raw_text": "Tom Bradley | Web Developer | tombradley@icloud.com | +1-555-0187\n\nSkills: JavaScript, PHP, WordPress, MySQL, Bootstrap\n\nExperience:\n2023-Present: Freelance Developer (12 months)\n2022-2023: Web Developer at AgencyX (8 months) - left due to culture fit\n2021-2022: Junior Developer at LocalBiz (10 months)\n\nEducation: Associate Degree Web Design, Community College 2021\n\nLanguages: English (native)\n\nGaps: 2 months between Agency and freelance work\nRed flags: Very short tenures, vague descriptions of responsibilities",
    },
    {
        "name": "Amara Diallo",
        "email": "amara.diallo@gmail.com",
        "source": "email",
        "skills": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "GraphQL"],
        "experience_summary": "6 years consistent growth, strong open source contributor",
        "credibility_score": 85,
        "raw_text": "Amara Diallo | Senior Software Engineer | amara.diallo@gmail.com | +33-6-12-34-56-78\n\nSkills: React, TypeScript, Python, FastAPI, PostgreSQL, Docker, AWS, GraphQL\n\nExperience:\n2021-Present: Senior Engineer at TechParis (36 months)\n2019-2021: Software Engineer at StartupFrance (24 months)\n2018-2019: Junior Developer at WebAgence (12 months)\n\nEducation: M.Eng Computer Science, École Polytechnique 2018\n\nLanguages: English (fluent), French (native), Arabic (fluent)",
    },
    {
        "name": "James Kim",
        "email": "james.kim.eng@gmail.com",
        "source": "linkedin",
        "skills": ["React", "TypeScript", "Rust", "Python", "PostgreSQL", "Kubernetes", "AWS", "Terraform", "Go"],
        "experience_summary": "10 years, senior IC at FAANG, exceptional technical depth",
        "credibility_score": 95,
        "raw_text": "James Kim | Staff Engineer | james.kim.eng@gmail.com | +1-415-555-0142\n\nSkills: React, TypeScript, Rust, Python, PostgreSQL, Kubernetes, AWS, Terraform, Go\n\nExperience:\n2020-Present: Staff Engineer at TechGiant Corp (48 months)\n2017-2020: Senior Software Engineer at CloudScale (36 months)\n2014-2017: Software Engineer at InnoSystems (36 months)\n2012-2014: Junior Engineer at DevShop (24 months)\n\nEducation: B.Sc Computer Science, Stanford University 2012\n\nLanguages: English (native), Korean (heritage)",
    },
    {
        "name": "Priya Sharma",
        "email": "priya.sharma.code@gmail.com",
        "source": "manual",
        "skills": ["React", "Vue.js", "Python", "Django", "PostgreSQL", "AWS"],
        "experience_summary": "4 years, primarily frontend, decent fullstack capabilities",
        "credibility_score": 67,
        "raw_text": "Priya Sharma | Frontend Developer | priya.sharma.code@gmail.com | +91-87654-32109\n\nSkills: React, Vue.js, Python, Django, PostgreSQL, AWS\n\nExperience:\n2022-Present: Frontend Developer at SaaSCompany (24 months)\n2020-2022: Junior Frontend at DesignStudio (20 months)\n2019-2020: Intern at TechStartup (8 months)\n\nEducation: B.Sc Computer Science, University of Delhi 2019\n\nLanguages: English (fluent), Hindi (native), Tamil (basic)",
    },
]

print(f"Creating {len(CANDIDATES)} candidates...")
created_candidates = []

for c in CANDIDATES:
    print(f"  Processing {c['name']}...")
    raw_text = c["raw_text"]

    # Build parsed structure
    parsed = {
        "name": c["name"],
        "email": c["email"],
        "phone": c["email"].replace("@", "+").replace(".", ""),  # fake phone
        "skills": c["skills"],
        "languages": ["English"],
        "education": [{"degree": "B.Sc Computer Science", "institution": "University", "year": "2018"}],
        "experience": [{"company": "Company", "role": "Engineer", "start_date": "2020-01", "end_date": None, "duration_months": 48, "description": c["experience_summary"]}],
        "gaps": [],
        "red_flags": [],
    }

    embedding = embed(raw_text)

    result = db.table("candidates").insert({
        "name": c["name"],
        "email": c["email"],
        "source": c["source"],
        "raw_text": raw_text,
        "parsed": parsed,
        "credibility_score": c["credibility_score"],
        "embedding": embedding,
    }).execute()

    cand = result.data[0]
    created_candidates.append(cand)

    # Create application for this job
    import math
    cand_emb = embedding
    job_emb = job_embedding
    dot = sum(x * y for x, y in zip(cand_emb, job_emb))
    norm_a = math.sqrt(sum(x * x for x in cand_emb))
    norm_b = math.sqrt(sum(x * x for x in job_emb))
    sim = dot / (norm_a * norm_b) if norm_a and norm_b else 0
    match_score = max(0, min(100, round(sim * 100)))

    from services.scoring import calculate_overall_score
    overall = calculate_overall_score(match_score, c["credibility_score"], 0)

    app_result = db.table("applications").insert({
        "candidate_id": cand["id"],
        "job_id": job_id,
        "match_score": match_score,
        "credibility_score": c["credibility_score"],
        "interview_score": 0,
        "overall_score": overall,
        "status": "inbox",
    }).execute()

# ─── Pre-populate one completed interview for James Kim ───────────────────────
print("Adding completed interview for James Kim...")
james = next(c for c in created_candidates if c["name"] == "James Kim")
james_app = db.table("applications").select("*").eq("candidate_id", james["id"]).eq("job_id", job_id).single().execute().data

TRANSCRIPT = """Interviewer: Tell me about yourself and why you're interested in this role.
James: I'm a staff engineer with 10 years of experience building large-scale distributed systems. I've been at TechGiant for the past 4 years leading teams of 8-12 engineers. I'm interested in this role because I want to work on a product that directly impacts users at a smaller, more agile company where I can have broader technical ownership.

Interviewer: Can you describe a technically challenging project you've led?
James: At TechGiant, I led the migration of our monolithic payment service to a microservices architecture handling 50,000 TPS. We had to do it with zero downtime. I designed a strangler fig pattern with shadow traffic and gradual cutover. The biggest challenge was data consistency across services. We used event sourcing with Kafka and implemented saga patterns for distributed transactions. Reduced P99 latency by 60%.

Interviewer: How do you approach mentoring junior engineers?
James: I believe in structured mentorship. I pair program intentionally rather than just reviewing PRs. I give each junior engineer a real project with clear scope. I do 1-on-1s weekly focused on their growth, not just status updates. I also run internal tech talks so knowledge spreads across the team.

Interviewer: What's your experience with React and TypeScript?
James: I've been writing TypeScript since 2016. At TechGiant I established our TypeScript standards for a 40-person frontend team. I'm comfortable with React's internals — I've written custom renderers, optimized large list rendering with virtualization, and built design system components from scratch. I prefer a pragmatic approach: use the right abstraction level for the problem.

Interviewer: Where do you see yourself in 3 years?
James: I'd like to move into an engineering director role, but I'm not in a rush. I want to be in a company where I can grow technically and organizationally. I care more about impact than title. In 3 years I'd want to have shipped products that changed users' lives and grown 2-3 people into senior engineers."""

ANALYSIS = {
    "answer_quality_score": 92,
    "communication_score": 89,
    "summary": "James demonstrated exceptional technical depth and clear communication. His answers were structured, concrete, and showed genuine leadership experience. Standout candidate who would likely be a culture add.",
    "strengths": [
        "Exceptional technical depth in distributed systems",
        "Clear communication with concrete metrics",
        "Strong mentorship philosophy"
    ],
    "concerns": [
        "May be overqualified — risk of leaving for a larger company",
        "Salary expectations likely high"
    ],
    "attention_score": 95,
    "interview_score": 90,
    "per_question": [
        {"question": "Tell me about yourself", "score": 90, "notes": "Clear and focused, immediately connected to the role."},
        {"question": "Technically challenging project", "score": 95, "notes": "Specific metrics, sophisticated architectural thinking."},
        {"question": "Mentoring approach", "score": 88, "notes": "Thoughtful framework, shows genuine investment in others."},
        {"question": "React/TypeScript experience", "score": 92, "notes": "Deep technical knowledge, pragmatic mindset."},
        {"question": "3 year plan", "score": 87, "notes": "Balanced and honest, growth-oriented."},
    ]
}

match_score = james_app.get("match_score", 75)
cred_score = james.get("credibility_score", 95)
from services.scoring import calculate_overall_score
overall = calculate_overall_score(match_score, cred_score, 90)

db.table("applications").update({
    "transcript": TRANSCRIPT,
    "analysis": ANALYSIS,
    "attention_events": [
        {"type": "gaze_away", "timestamp": 45},
        {"type": "gaze_away", "timestamp": 180},
    ],
    "interview_score": 90,
    "overall_score": overall,
    "status": "interview_done",
    "interview_room_url": "https://demo.daily.co/interview-demo",
    "video_url": None,
}).eq("id", james_app["id"]).execute()

# Also move a few candidates to other statuses for a populated board
alice = next(c for c in created_candidates if c["name"] == "Alice Chen")
alice_app = db.table("applications").select("id").eq("candidate_id", alice["id"]).eq("job_id", job_id).single().execute().data
db.table("applications").update({"status": "shortlisted"}).eq("id", alice_app["id"]).execute()

amara = next(c for c in created_candidates if c["name"] == "Amara Diallo")
amara_app = db.table("applications").select("id").eq("candidate_id", amara["id"]).eq("job_id", job_id).single().execute().data
db.table("applications").update({"status": "shortlisted"}).eq("id", amara_app["id"]).execute()

james_final = db.table("applications").select("id").eq("candidate_id", james["id"]).eq("job_id", job_id).single().execute().data
db.table("applications").update({"status": "final_round"}).eq("id", james_final["id"]).execute()

sofia = next(c for c in created_candidates if c["name"] == "Sofia Andersen")
sofia_app = db.table("applications").select("id").eq("candidate_id", sofia["id"]).eq("job_id", job_id).single().execute().data
db.table("applications").update({"status": "interview_scheduled"}).eq("id", sofia_app["id"]).execute()

tom = next(c for c in created_candidates if c["name"] == "Tom Bradley")
tom_app = db.table("applications").select("id").eq("candidate_id", tom["id"]).eq("job_id", job_id).single().execute().data
db.table("applications").update({"status": "rejected"}).eq("id", tom_app["id"]).execute()

print("\nSeed complete!")
print(f"  Job: {JOB_TITLE} ({job_id})")
print(f"  {len(created_candidates)} candidates created and linked to job")
print(f"  James Kim has a completed interview (interview_done → final_round)")
