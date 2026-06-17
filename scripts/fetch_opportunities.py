import os
import json
import re
import sys
from datetime import datetime

# Import duckduckgo_search safely
try:
    from duckduckgo_search import DDGS
except ImportError:
    print("duckduckgo_search library not found. Installing it now...")
    import subprocess
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "duckduckgo_search"])
    except Exception:
        print("Standard installation failed. Trying with --break-system-packages...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--break-system-packages", "duckduckgo_search"])
        except Exception as e:
            print(f"Failed to install library: {e}")
            raise e
    from duckduckgo_search import DDGS

# Paths
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "opportunities.json")

# Core curated fallbacks to ensure the user ALWAYS has high-quality, real, active opportunities
CURATED_OPPORTUNITIES = [
    {
        "id": "c1",
        "title": "Smart India Hackathon (SIH) 2026",
        "type": "hackathon",
        "organization": "Ministry of Education, India",
        "link": "https://sih.gov.in/",
        "deadline": "Registration closes soon",
        "matchScore": 98,
        "description": "India's biggest national hackathon solving product development and digital solutions problems. Highly recognized for VIT Bhopal students.",
        "tags": ["Hackathon", "National", "VIT Recommended", "Team Event"]
    },
    {
        "id": "c2",
        "title": "Google Summer of Code (GSoC) 2026",
        "type": "internship",
        "organization": "Google & Open Source Organizations",
        "link": "https://summerofcode.withgoogle.com/",
        "deadline": "Applications open early next year",
        "matchScore": 95,
        "description": "A global program focused on bringing student developers into open-source software development. Work on computational data science or ML tools.",
        "tags": ["Internship", "Remote", "Stipend", "Open Source"]
    },
    {
        "id": "c3",
        "title": "IBM Data Science Professional Certificate",
        "type": "certificate",
        "organization": "IBM via Coursera",
        "link": "https://www.coursera.org/professional-certificates/ibm-data-science",
        "deadline": "Self-paced",
        "matchScore": 92,
        "description": "Get started in Data Science with Python, SQL, data visualization, analysis, and machine learning. Excellent for 2nd year portfolio building.",
        "tags": ["Course", "Free Audit", "Python", "SQL"]
    },
    {
        "id": "c4",
        "title": "Kaggle Machine Learning & Deep Learning Micro-Courses",
        "type": "course",
        "organization": "Kaggle",
        "link": "https://www.kaggle.com/learn",
        "deadline": "Self-paced",
        "matchScore": 94,
        "description": "Hands-on, bite-sized tutorials covering Python, Pandas, Machine Learning, Deep Learning, and Computer Vision. Includes free certificates of completion.",
        "tags": ["Course", "Free Certificate", "Hands-on", "Data Science"]
    },
    {
        "id": "c5",
        "title": "ISRO Computational Science & Data Analytics Summer Internship",
        "type": "internship",
        "organization": "ISRO - Indian Space Research Organisation",
        "link": "https://www.isro.gov.in/",
        "deadline": "Check local VIT coordinator / official site",
        "matchScore": 97,
        "description": "Prestigious computational and space data analysis internship. Perfect match for Integrated M.Tech Computational and Data Science students.",
        "tags": ["Internship", "Research", "Computational Science", "India"]
    },
    {
        "id": "c6",
        "title": "Hugging Face Deep RL and NLP Course",
        "type": "course",
        "organization": "Hugging Face",
        "link": "https://huggingface.co/learn",
        "deadline": "Self-paced",
        "matchScore": 90,
        "description": "Free, open-source course on Deep Reinforcement Learning and NLP using Transformers, Datasets, and Accelerate libraries. Ideal for AI specializations.",
        "tags": ["Course", "AI", "Transformers", "NLP"]
    },
    {
        "id": "c7",
        "title": "Devpost Global AI & LLM Hackathon Series",
        "type": "hackathon",
        "organization": "Devpost",
        "link": "https://devpost.com/hackathons?themes[]=AI%2FML",
        "deadline": "Ongoing weekly",
        "matchScore": 88,
        "description": "Build innovative AI/ML applications, agents, or models. Participate in global virtual hackathons with large cash prizes and networking.",
        "tags": ["Hackathon", "Remote", "AI/ML", "Cash Prizes"]
    },
    {
        "id": "c8",
        "title": "Unstop Data Science Hackathons & Hiring Challenges",
        "type": "hackathon",
        "organization": "Unstop",
        "link": "https://unstop.com/hackathons?filters=data-science",
        "deadline": "Varies by competition",
        "matchScore": 93,
        "description": "Explore and register for active hackathons, coding challenges, and internships curated for college students in India.",
        "tags": ["Hackathon", "India", "College Students", "Coding"]
    }
]

def is_relevant(title, body, opp_type):
    text = (title + " " + body).lower()
    
    # Must contain at least one of these tech/education keywords
    tech_keywords = [
        "data", "science", "analytic", "machine", "learning", "ml", "ai ", "artificial", "intelligence",
        "python", "code", "coding", "program", "develop", "software", "comput", "algorithm", "statistics",
        "database", "sql", "hackathon", "intern", "course", "certific", "deep learning", "neural", "tensor",
        "keras", "pytorch", "hacker", "contest", "compet", "web", "frontend", "backend", "fullstack", "study"
    ]
    
    has_tech_keyword = any(kw in text for kw in tech_keywords)
    
    # Discard obviously irrelevant topics
    irrelevant_keywords = [
        "movie", "game", "play free", "tv show", "watch free", "poki", "plex.tv", "tubi", "gaming", 
        "stream free", "showtime", "netflix", "arcade", "toy", "card game"
    ]
    has_irrelevant_keyword = any(kw in text for kw in irrelevant_keywords)
    
    if has_irrelevant_keyword:
        return False

    # For hackathons, it must look like a competition or coding event
    if opp_type == "hackathon":
        if not any(kw in text for kw in ["hack", "contest", "compet", "code", "coding", "challenge", "event"]):
            return False
            
    # For internships, it must look like a job or intern program
    if opp_type == "internship":
        if not any(kw in text for kw in ["intern", "job", "career", "work", "hiring", "program", "position", "role", "placement", "opp", "fellowship"]):
            return False

    return has_tech_keyword

def calculate_match_score(title, description):
    text = (title + " " + description).lower()
    score = 65  # Base score for matching queries

    # High match for 2nd year students
    if "2nd year" in text or "second year" in text or "sophomore" in text or "undergrad" in text:
        score += 15
    # High match for Computational & Data Science / AI
    if "computational" in text or "data science" in text or "data analytics" in text:
        score += 10
    if "machine learning" in text or "ml" in text or "ai " in text or "artificial intelligence" in text:
        score += 10
    if "python" in text or "sql" in text:
        score += 5
    # High match for India
    if "india" in text or "remote" in text:
        score += 5
    # High match for VIT
    if "vit" in text or "bhopal" in text:
        score += 10

    return min(score, 99)

def fetch_from_duckduckgo():
    # Simplest keywords to avoid triggering DuckDuckGo blocks or empty responses
    queries = {
        "hackathon": "hackathons",
        "internship": "data science internship",
        "course": "free data science courses",
        "certificate": "AI certification"
    }

    crawled_items = []
    
    print("Starting DuckDuckGo search queries...")
    with DDGS() as ddgs:
        for opp_type, query in queries.items():
            print(f"Searching for {opp_type}s with query: '{query}'...")
            try:
                results = list(ddgs.text(query))
                count = 0
                for r in results[:8]:  # Limit to top 8 results to prevent spam
                    title = r.get("title", "")
                    link = r.get("href", "")
                    body = r.get("body", "")

                    if not title or not link:
                        continue

                    # Filter out noise
                    if any(domain in link for domain in ["youtube.com", "facebook.com", "instagram.com", "twitter.com"]):
                        continue

                    # Filter out irrelevant search results (e.g. movies, games, general online freebies)
                    if not is_relevant(title, body, opp_type):
                        continue

                    # Determine score
                    score = calculate_match_score(title, body)

                    # Extract organization name if possible (e.g., from domain or title)
                    domain_match = re.search(r'https?://(?:www\.)?([^/]+)', link)
                    org = domain_match.group(1) if domain_match else "Online Portal"
                    
                    if "coursera" in link:
                        org = "Coursera"
                    elif "udemy" in link:
                        org = "Udemy"
                    elif "unstop" in link:
                        org = "Unstop"
                    elif "devpost" in link:
                        org = "Devpost"
                    elif "linkedin" in link:
                        org = "LinkedIn Careers"
                    elif "internshala" in link:
                        org = "Internshala"
                    elif "hackerearth" in link:
                        org = "HackerEarth"
                    elif "google" in link:
                        org = "Google"
                    elif "ibm" in link:
                        org = "IBM"

                    # Generate a deadline representation
                    deadline = "Check official site"
                    date_matches = re.findall(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:, \d{4})?\b', body)
                    if date_matches:
                        deadline = date_matches[0]

                    tags = [opp_type.capitalize()]
                    if "remote" in body.lower() or "remote" in title.lower():
                        tags.append("Remote")
                    else:
                        tags.append("India")
                    
                    if score >= 80:
                        tags.append("Top Match")
                    
                    if "python" in (title + body).lower():
                        tags.append("Python")

                    crawled_items.append({
                        "id": f"ddg-{opp_type}-{count}-{hash(title) % 10000}",
                        "title": title,
                        "type": "certificate" if opp_type == "certificate" else opp_type,
                        "organization": org,
                        "link": link,
                        "deadline": deadline,
                        "matchScore": score,
                        "description": body,
                        "tags": tags
                    })
                    count += 1
                print(f"Found {count} opportunities for {opp_type}.")
            except Exception as e:
                print(f"Error searching for {opp_type}s: {e}")

    # Remove duplicates based on title similarity or exact links
    unique_items = []
    seen_links = set()
    for item in crawled_items:
        if item["link"] not in seen_links:
            seen_links.add(item["link"])
            unique_items.append(item)

    return unique_items

def main():
    print("=========================================")
    print("DATA SCIENCE & AI OPPORTUNITIES SCRAPER")
    print(f"Execution Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=========================================")

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Fetch fresh items
    fresh_opportunities = []
    try:
        fresh_opportunities = fetch_from_duckduckgo()
    except Exception as e:
        print(f"Overall scraping execution failed: {e}")
        print("Using curated list and offline data sources...")

    # Combine fresh opportunities with curated items
    # Curated items are placed first as they are extremely high value/real
    combined = []
    seen_titles = set()
    
    for item in CURATED_OPPORTUNITIES:
        combined.append(item)
        seen_titles.add(item["title"].lower())

    for item in fresh_opportunities:
        title_lower = item["title"].lower()
        # Simple duplicate check
        is_dup = False
        for seen in seen_titles:
            if seen in title_lower or title_lower in seen:
                is_dup = True
                break
        if not is_dup:
            combined.append(item)
            seen_titles.add(title_lower)

    # Save to JSON database
    db_content = {
        "lastUpdated": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "count": len(combined),
        "opportunities": combined
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(db_content, f, indent=2)

    print(f"\nSuccessfully saved {len(combined)} opportunities to database.")
    print("Research process completed successfully!")
    print("=========================================")

if __name__ == "__main__":
    main()
