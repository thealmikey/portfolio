import { useEffect, useRef, useState } from 'react'
import { Agentation } from 'agentation'
import './index.css'

// Circuit background with animated glowing nodes
function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let nodes: { x: number; y: number; vx: number; vy: number; radius: number; glow: number }[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initNodes()
    }

    const initNodes = () => {
      nodes = []
      const count = Math.floor((canvas.width * canvas.height) / 25000)
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.5,
          glow: Math.random() * 0.5 + 0.2,
        })
      }
    }

    const draw = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = 'rgba(79, 70, 229, 0.06)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      for (const node of nodes) {
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 4)
        gradient.addColorStop(0, `rgba(79, 70, 229, ${node.glow * 0.3})`)
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(79, 70, 229, ${node.glow})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()

        node.x += node.vx
        node.y += node.vy

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1
      }

      animationId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.6,
      }}
      aria-hidden="true"
    />
  )
}

// Project data
const projects = [
  {
    id: 'brokk',
    title: 'Brokk',
    context: 'AI Software Engineer · Contract · Oct–Nov 2025',
    description: (
      <div>
        <p><strong>AI-assisted developer tooling</strong></p>
        <ul>
          <li>Worked on infrastructure for AI-assisted software development.</li>
          <li>Designed prompt workflows for more reliable AI responses.</li>
          <li>Implemented tool-calling capabilities for AI agents.</li>
          <li>Integrated <strong>Language Server Protocol (LSP)</strong> features for semantic code intelligence.</li>
          <li>Worked with <strong>Tree-sitter</strong> to give AI systems richer, syntax-aware code context.</li>
        </ul>
      </div>
    ),
    tags: ['AI Agents', 'Tool Calling', 'LSP', 'Tree-sitter', 'TypeScript'],
  },
  {
    id: 'kamusi',
    title: 'Kamusi Project',
    context: 'Software Developer · 2019–2020',
    description: (
      <div>
        <p><strong>Language technology for African languages</strong></p>
        <ul>
          <li>Contributed to software and data projects focused on African languages.</li>
          <li>Worked on backend services and language-focused applications.</li>
          <li>Built ETL workflows for multilingual datasets.</li>
          <li>Migrated language data between databases.</li>
          <li>Worked with language resources and NLP-related systems.</li>
        </ul>
      </div>
    ),
    tags: ['NLP', 'ETL', 'Python', 'Multilingual Data', 'Databases'],
  },
  {
    id: 'woven',
    title: 'Woven',
    context: 'Technical Assessment Evaluator · Oct 2020–Present',
    description: (
      <div>
        <p><strong>Technical evaluation at scale</strong></p>
        <ul>
          <li>Evaluate software engineering assessments across frontend, backend, cloud, and system design.</li>
          <li>Review technical decisions, implementation quality, reasoning, and communication.</li>
          <li>Apply consistent evaluation standards across a large volume of work.</li>
          <li>Provide clear feedback that explains both strengths and weaknesses.</li>
          <li>The work requires technical judgment, consistency, and attention to detail.</li>
        </ul>
      </div>
    ),
    tags: ['Technical Evaluation', 'Code Review', 'Quality Assurance', 'Frontend', 'Backend', 'Cloud', 'System Design'],
  },
  {
    id: 'recordbay',
    title: 'Recordbay',
    context: 'Full Stack Developer · May–Jul 2021',
    description: (
      <div>
        <p><strong>Full-stack product development</strong></p>
        <ul>
          <li>Developed frontend features with <strong>React</strong>.</li>
          <li>Built backend functionality with <strong>Scala, Play Framework, and Akka</strong>.</li>
          <li>Automated development workflows with <strong>Bash</strong>.</li>
          <li>Worked as part of an international remote engineering team.</li>
        </ul>
      </div>
    ),
    tags: ['React', 'Scala', 'Akka', 'Play Framework', 'Bash'],
  },
  {
    id: 'uchat',
    title: 'Uchat',
    context: 'Backend / Android Developer · Sep 2019–Jan 2020',
    description: (
      <div>
        <p><strong>Backend and mobile development</strong></p>
        <ul>
          <li>Worked across backend services and Android features.</li>
          <li>Developed with <strong>Kotlin and Scala</strong>.</li>
          <li>Worked with <strong>WebRTC</strong> for real-time communication.</li>
          <li>Built and maintained <strong>CircleCI</strong> workflows.</li>
        </ul>
      </div>
    ),
    tags: ['Kotlin', 'Scala', 'Android', 'WebRTC', 'CI/CD'],
  },
]

const experience = [
  {
    role: 'AI Software Engineer',
    org: 'Brokk',
    period: 'Oct 2025 – Nov 2025',
    description: 'Worked on AI-assisted developer tooling, including agent tool calling, prompt workflows, LSP integration, and syntax-aware code parsing.',
  },
  {
    role: 'Technical Assessment Evaluator',
    org: 'Woven',
    period: 'Oct 2020 – Present',
    description: 'Evaluate engineering assessments across frontend, backend, cloud, and system design. Focus on technical quality, reasoning, consistency, and constructive feedback.',
  },
  {
    role: 'Full Stack Developer',
    org: 'Recordbay GmbH',
    period: 'May 2021 – Jul 2021',
    description: 'Developed React frontend features and Scala/Akka backend services. Automated development workflows and worked with a distributed engineering team.',
  },
  {
    role: 'Software Developer',
    org: 'Kamusi Project International',
    period: '2019 – 2020',
    description: 'Contributed to African language technology and multilingual data projects. Worked on backend systems, ETL pipelines, and language data migration.',
  },
  {
    role: 'Backend / Android Developer',
    org: 'Uchat Inc.',
    period: 'Sep 2019 – Jan 2020',
    description: 'Worked on backend services and Android features using Kotlin and Scala. Contributed to WebRTC functionality and CI/CD workflows.',
  },
]

function App() {
  const [scrolled, setScrolled] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            entry.target.classList.add('scroll-exit-up')
          } else {
            entry.target.classList.remove('scroll-exit-up')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    )

    const elements = document.querySelectorAll(
      '.project-entry, .taxonomy-node, .timeline-item, .problem-item, .filter-list li, .collaboration-filter'
    )
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="site">
      {import.meta.env.DEV && <Agentation />}

      {/* Grain overlay */}
      <div className="grain" aria-hidden="true" />

      {/* Navigation */}
      <nav
        className={`nav ${scrolled ? 'nav--scrolled' : ''}`}
        aria-label="Primary"
      >
        <a href="#" className="nav-logo">Michael Gikaru</a>
        <button
          className="nav-toggle"
          onClick={() => setNavOpen(!navOpen)}
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
        >
          <span className={`nav-toggle-line ${navOpen ? 'open' : ''}`} />
          <span className={`nav-toggle-line ${navOpen ? 'open' : ''}`} />
        </button>
        <ul className={`nav-links ${navOpen ? 'nav-links--open' : ''}`}>
          <li><a href="#work" onClick={() => setNavOpen(false)}>Work</a></li>
          <li><a href="#capabilities" onClick={() => setNavOpen(false)}>Capabilities</a></li>
          <li><a href="#experience" onClick={() => setNavOpen(false)}>Experience</a></li>
          <li><a href="#belief" onClick={() => setNavOpen(false)}>Belief</a></li>
          <li><a href="#contact" onClick={() => setNavOpen(false)}>Contact</a></li>
        </ul>
        {navOpen && (
          <div
            className="nav-backdrop"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}
      </nav>

      {/* Hero */}
      <header className="hero">
        <CircuitBackground />
        <div className="grid-overlay" aria-hidden="true" />

        <div className="hero-layout">
          <div className="hero-image-wrapper animate-in">
            <img
              src="/michael.jpg"
              alt="Michael Gikaru"
              className="hero-image"
              loading="eager"
            />
            <div className="hero-image-border" aria-hidden="true" />
          </div>

          <div className="hero-content animate-in animate-in-delay-1">
            <span className="hero-eyebrow">Software Engineer · AI &amp; Technical Evaluation · Language Technology</span>
            <h1 className="hero-title display-xl">
              Michael<br />
              <em>Gikaru</em>
            </h1>
            <p className="hero-subtitle">
              I build software, AI systems, and developer tools.
            </p>
            <div className="hero-meta">
              <span>Nairobi, Kenya</span>
              <span>Native Swahili · Fluent English</span>
              <span>Remote</span>
            </div>
          </div>
        </div>
      </header>

      {/* Projects I have worked on */}
      <section id="work" className="section">
        <div className="container">
          <div className="lexicon-header">
            <div>
              <span className="section-number">01</span>
              <h2>Projects I have worked on</h2>
            </div>
            <span className="meta">Selected projects</span>
          </div>

          {projects.map((project, index) => (
            <article
              key={project.id}
              className={`project-entry animate-in animate-in-delay-${index + 1}`}
            >
              <div className="project-header">
                <h3 className="project-title">{project.title}</h3>
                <div className="project-meta">{project.context}</div>
              </div>
              <div className="project-role">
                {project.id === 'brokk' && 'AI Software Engineer · Contract · Oct–Nov 2025'}
                {project.id === 'kamusi' && 'Software Developer · 2019–2020'}
                {project.id === 'woven' && 'Technical Assessment Evaluator · Oct 2020–Present'}
                {project.id === 'recordbay' && 'Full Stack Developer · May–Jul 2021'}
                {project.id === 'uchat' && 'Backend / Android Developer · Sep 2019–Jan 2020'}
              </div>
              <div className="project-body">
                <div className="project-description">
                  {project.description}
                </div>
                <div className="project-tech">
                  <span className="project-tech-label">Tech</span>
                  {project.tags.map(tag => (
                    <span key={tag} className="project-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* What I Do */}
      <section id="capabilities" className="section section-warm">
        <div className="container">
          <div className="lexicon-header">
            <div>
              <span className="section-number">02</span>
              <h2>What I do</h2>
            </div>
            <span className="meta">4 domains</span>
          </div>

          <div className="taxonomy">
            <div className={`taxonomy-node animate-in animate-in-delay-1`}>
              <span className="taxonomy-depth">01</span>
              <div>
                <div className="taxonomy-label">Software Engineering</div>
                <div className="taxonomy-children">
                  <span className="taxonomy-child">Building and improving web, backend, and mobile systems.</span>
                  <span className="taxonomy-child taxonomy-tech">React · TypeScript · Scala · Kotlin · Node.js · PostgreSQL · REST APIs</span>
                </div>
              </div>
            </div>
            <div className={`taxonomy-node animate-in animate-in-delay-2`}>
              <span className="taxonomy-depth">02</span>
              <div>
                <div className="taxonomy-label">AI &amp; AI-Assisted Development</div>
                <div className="taxonomy-children">
                  <span className="taxonomy-child">Building practical AI workflows and integrating AI into software systems.</span>
                  <span className="taxonomy-child taxonomy-tech">LLM Applications · AI Agents · Tool Calling · Prompt Design · AI Evaluation · Developer Tools</span>
                </div>
              </div>
            </div>
            <div className={`taxonomy-node animate-in animate-in-delay-3`}>
              <span className="taxonomy-depth">03</span>
              <div>
                <div className="taxonomy-label">Language &amp; Data</div>
                <div className="taxonomy-children">
                  <span className="taxonomy-child">Working with language data and systems that need to handle multilingual information.</span>
                  <span className="taxonomy-child taxonomy-tech">NLP · Multilingual Data · Swahili · ETL · Data Migration · Language Technology</span>
                </div>
              </div>
            </div>
            <div className={`taxonomy-node animate-in animate-in-delay-4`}>
              <span className="taxonomy-depth">04</span>
              <div>
                <div className="taxonomy-label">Technical Evaluation</div>
                <div className="taxonomy-children">
                  <span className="taxonomy-child">Assessing software against clear technical standards.</span>
                  <span className="taxonomy-child taxonomy-tech">Code Review · Technical Assessment · Quality Evaluation · Feedback · Frontend · Backend · Cloud · System Design</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section id="experience" className="section section-warm">
        <div className="container">
          <div className="lexicon-header">
            <div>
              <span className="section-number">—</span>
              <h2>Experience</h2>
            </div>
            <span className="meta">2019–present</span>
          </div>

          <div className="timeline">
            {experience.map((exp, i) => (
              <div
                key={i}
                className={`timeline-item animate-in animate-in-delay-${Math.min(i + 1, 4)}`}
              >
                <h3 className="timeline-role">{exp.role}</h3>
                <div className="timeline-org">{exp.org}</div>
                <span className="timeline-period">{exp.period}</span>
                <p className="timeline-desc">{exp.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems I Can Help With */}
      <section className="section section-ink">
        <div className="container">
          <div className="lexicon-header">
            <div>
              <span className="section-number">03</span>
              <h2 className="underline-syntax">Problems I can help with</h2>
            </div>
          </div>
          <div className="section-body">
            <div className="collaboration-filter">
              <p>
                You don't need another person who only writes code. You may need someone who can <span className="syntax-accent">understand the problem</span>, <span className="syntax-accent">work out the technical path</span>, <span className="syntax-accent">build it</span>, and <span className="syntax-accent">question the result</span>.
              </p>
              <div className="problems-grid">
                <div className="problem-item">
                  <h4 className="problem-title">AI &amp; automation</h4>
                  <p className="problem-desc">Turning an AI idea into a practical workflow or product feature.</p>
                </div>
                <div className="problem-item">
                  <h4 className="problem-title">Software &amp; prototypes</h4>
                  <p className="problem-desc">Taking an idea from concept to a working technical prototype.</p>
                </div>
                <div className="problem-item">
                  <h4 className="problem-title">Existing systems</h4>
                  <p className="problem-desc">Understanding, debugging, improving, or extending software that already exists.</p>
                </div>
                <div className="problem-item">
                  <h4 className="problem-title">Developer tools</h4>
                  <p className="problem-desc">Building tools that help engineers work with code, AI, and development workflows.</p>
                </div>
                <div className="problem-item">
                  <h4 className="problem-title">Data &amp; language</h4>
                  <p className="problem-desc">Working with multilingual data, ETL pipelines, language technology, and data-heavy systems.</p>
                </div>
                <div className="problem-item">
                  <h4 className="problem-title">Technical evaluation</h4>
                  <p className="problem-desc">Reviewing software, assessing technical work, and creating consistent evaluation processes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Belief */}
      <section id="belief" className="section section-ink">
        <div className="container">
          <div className="lexicon-header">
            <div>
              <span className="section-number">04</span>
              <h2 className="underline-evaluation">I like problems that don't fit neatly</h2>
            </div>
          </div>
          <div className="section-body">
            <p>
              The best problems are rarely just technical. They involve people, data, software, behaviour, or incomplete information. Sometimes the hardest part is deciding what to build.
            </p>
            <p>
              My background spans psychology, linguistics, software engineering, AI, and technical evaluation. It taught me to look at problems from different angles.
            </p>
            <div className="belief-questions">
              <p>What are we trying to solve?</p>
              <p>How should the system work?</p>
              <p>Where could it fail?</p>
              <p>How do we know it works?</p>
            </div>
            <p>
              I like turning unclear ideas into working systems. I build. I test. I observe. I refine. The first version is rarely the final answer.
            </p>

            <div className="collaboration-filter">
              <h3 className="filter-title">Who I work well with</h3>
              <ul className="filter-list">
                <li>Founders with an idea that needs a technical path.</li>
                <li>Teams with a prototype that needs to become a real product.</li>
                <li>Engineers dealing with a system that has become difficult to change.</li>
                <li>Researchers exploring an idea that needs a working implementation.</li>
                <li>Anyone with a difficult problem where the answer is not obvious yet.</li>
              </ul>
              <p className="filter-cta">
                <strong>Bring me the problem.</strong> We can work out the solution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Let's Work On Something */}
      <section id="contact" className="section">
        <div className="container">
          <div className="contact">
            <span className="section-number">05</span>
            <h2 className="contact-title display-md">Let's work on something</h2>
            <p className="contact-lead">
              Have a difficult problem? Tell me what you're trying to solve. I'll help you figure out what comes next.
            </p>
            <div className="contact-links">
              <a href="mailto:thealmikey@gmail.com" className="contact-link" aria-label="Email">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4L12 13 2 4" />
                </svg>
                <span>Email</span>
              </a>
              <a href="https://github.com/thealmikey" target="_blank" rel="noopener noreferrer" className="contact-link" aria-label="GitHub">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                <span>GitHub</span>
              </a>
              <a href="https://www.linkedin.com/in/michael-gikaru-0a4a9a60/" target="_blank" rel="noopener noreferrer" className="contact-link" aria-label="LinkedIn">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                <span>LinkedIn</span>
              </a>
              <a href="https://medium.com/@thealmikey" target="_blank" rel="noopener noreferrer" className="contact-link" aria-label="Medium">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v16H4z" />
                  <path d="M8 8l2.5 8 2.5-8 2.5 8 2.5-8" />
                </svg>
                <span>Medium</span>
              </a>
              <a href="https://wa.me/254716854639" target="_blank" rel="noopener noreferrer" className="contact-link" aria-label="WhatsApp">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <span className="footer-text">© 2025 Michael Gikaru</span>
            <span className="footer-text">Nairobi, Kenya</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
