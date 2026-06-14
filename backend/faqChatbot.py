"""
FAQ Chatbot System
==================
Complete implementation with NLP preprocessing, text similarity matching,
and a Flask web API for serving the chatbot.

Features:
- Text tokenization and preprocessing with NLTK
- TF-IDF vectorization with scikit-learn
- Cosine similarity matching
- Confidence scoring
- Flask REST API
- Interactive CLI interface
"""

import json
import math
from collections import Counter
from typing import List, Tuple, Dict
import re

# Optional: For better results, install these packages:
# pip install scikit-learn nltk spacy flask

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Note: scikit-learn not available. Using pure Python implementation.")

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.stem import PorterStemmer
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    print("Note: NLTK not available. Using basic tokenization.")


class FAQChatbot:
    """FAQ Chatbot with NLP preprocessing and similarity matching"""

    def __init__(self):
        """Initialize the chatbot with FAQ database"""
        self.faq_database = self._load_faqs()
        self.processed_questions = []
        self.vectorizer = None
        self.tfidf_matrix = None
        
        # Initialize NLP tools
        self.stemmer = PorterStemmer() if NLTK_AVAILABLE else None
        self.stop_words = self._get_stopwords()
        
        # Preprocess all FAQ questions
        self._preprocess_faqs()

    def _get_stopwords(self) -> set:
        """Get stopwords for filtering"""
        if NLTK_AVAILABLE:
            try:
                return set(stopwords.words('english'))
            except LookupError:
                nltk.download('stopwords')
                return set(stopwords.words('english'))
        else:
            # Basic English stopwords
            return {
                'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
                'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or',
                'such', 'that', 'the', 'to', 'was', 'will', 'with', 'your',
                'you', 'this', 'what', 'how', 'my', 'do', 'does', 'did', 'can',
                'could', 'would', 'should', 'have', 'has', 'had', 'am', 'me',
                'him', 'her', 'we', 'they', 'their'
            }

    def _load_faqs(self) -> List[Dict]:
        """Load FAQ database"""
        return [
            # ── General (6) ──────────────────────────────────────────
            {
                "id": 1,
                "question": "What is cloud hosting?",
                "answer": "Cloud hosting is a service where your website or application is hosted on multiple servers that work together as a single system. This ensures high availability, scalability, and reliability compared to traditional hosting.",
                "category": "General"
            },
            {
                "id": 2,
                "question": "Can I use a custom domain with cloud hosting?",
                "answer": "Absolutely! You can connect any custom domain. We provide free domain setup assistance and handle DNS configuration for you.",
                "category": "General"
            },
            {
                "id": 3,
                "question": "What operating systems are available?",
                "answer": "We offer Ubuntu, Debian, CentOS, Rocky Linux, and Windows Server. You can choose the OS that best fits your application stack during instance creation.",
                "category": "General"
            },
            {
                "id": 4,
                "question": "Do you offer a free trial?",
                "answer": "Yes! New customers receive a 14-day free trial with full access to all features. No credit card is required to start, and you can upgrade to a paid plan at any time.",
                "category": "General"
            },
            {
                "id": 5,
                "question": "What regions are your data centers located in?",
                "answer": "We operate data centers in North America (US-East, US-West), Europe (Frankfurt, London, Amsterdam), and Asia-Pacific (Singapore, Tokyo, Sydney). You can deploy in one or more regions for low-latency global coverage.",
                "category": "General"
            },
            {
                "id": 6,
                "question": "How do I create an account?",
                "answer": "Visit our sign-up page, enter your email and a password, and verify your email address. You'll have a fully functional dashboard within minutes. Social logins via Google and GitHub are also available.",
                "category": "General"
            },

            # ── Pricing (6) ──────────────────────────────────────────
            {
                "id": 7,
                "question": "How much does cloud hosting cost?",
                "answer": "Cloud hosting pricing varies based on your usage and resources. We offer flexible pay-as-you-go plans starting from $5/month for basic websites, with enterprise solutions available for larger needs.",
                "category": "Pricing"
            },
            {
                "id": 8,
                "question": "Are there any hidden fees?",
                "answer": "No hidden fees, ever. You only pay for the resources you use. Bandwidth overages, support, and backups are included in every plan at no extra charge.",
                "category": "Pricing"
            },
            {
                "id": 9,
                "question": "Do you offer discounts for annual billing?",
                "answer": "Yes! Switching to annual billing saves you up to 20% compared to monthly pricing. We also offer custom volume discounts for enterprise and startup customers.",
                "category": "Pricing"
            },
            {
                "id": 10,
                "question": "What payment methods do you accept?",
                "answer": "We accept Visa, MasterCard, American Express, PayPal, and wire transfers. Enterprise clients can also arrange purchase-order-based invoicing on Net-30 terms.",
                "category": "Pricing"
            },
            {
                "id": 11,
                "question": "Can I upgrade or downgrade my plan at any time?",
                "answer": "Absolutely. You can scale your plan up or down from the dashboard at any time. Changes take effect immediately, and billing is prorated so you only pay for what you use.",
                "category": "Pricing"
            },
            {
                "id": 12,
                "question": "Is there a money-back guarantee?",
                "answer": "Yes, we offer a 30-day money-back guarantee on all plans. If you're not satisfied, contact support within 30 days for a full refund—no questions asked.",
                "category": "Pricing"
            },

            # ── Technical (6) ────────────────────────────────────────
            {
                "id": 13,
                "question": "Can I scale my website with cloud hosting?",
                "answer": "Yes! Cloud hosting allows automatic scaling. Your resources automatically increase during traffic spikes and decrease during low traffic periods, ensuring optimal performance and cost efficiency.",
                "category": "Technical"
            },
            {
                "id": 14,
                "question": "What programming languages are supported?",
                "answer": "We support PHP, Python, Node.js, Ruby, Java, Go, .NET, and Rust. You can choose your preferred language or combine several in the same project using containers.",
                "category": "Technical"
            },
            {
                "id": 15,
                "question": "Do you support Docker and Kubernetes?",
                "answer": "Yes! Our platform provides a fully managed Kubernetes engine and native Docker runtime. You can deploy containerized apps with a single command or through our web console.",
                "category": "Technical"
            },
            {
                "id": 16,
                "question": "What databases are available?",
                "answer": "We offer managed MySQL, PostgreSQL, MongoDB, Redis, and Elasticsearch. Each comes with automated backups, point-in-time recovery, and read replicas for high availability.",
                "category": "Technical"
            },
            {
                "id": 17,
                "question": "Can I use serverless functions?",
                "answer": "Yes! Our serverless platform lets you deploy functions in Node.js, Python, Go, and Java. Pay only for execution time and scale automatically from zero to thousands of concurrent requests.",
                "category": "Technical"
            },
            {
                "id": 18,
                "question": "Do you provide API access?",
                "answer": "We offer a comprehensive RESTful API and CLI tool for managing resources. Full documentation, SDKs for Python, Node.js, and Go, and interactive Swagger docs are all available.",
                "category": "Technical"
            },

            # ── Support (6) ──────────────────────────────────────────
            {
                "id": 19,
                "question": "What is your uptime guarantee?",
                "answer": "We guarantee 99.99% uptime. Our SLA covers any downtime beyond this percentage with service credits automatically applied to your account.",
                "category": "Support"
            },
            {
                "id": 20,
                "question": "What happens if my website goes down?",
                "answer": "Our redundant systems ensure automatic failover. If one server fails, traffic is instantly redirected to healthy nodes. We monitor 24/7 and our on-call team is alerted within seconds.",
                "category": "Support"
            },
            {
                "id": 21,
                "question": "What technical support do you offer?",
                "answer": "We provide 24/7/365 support via live chat, email, and phone. Our team includes certified cloud engineers with an average response time under 5 minutes for critical issues.",
                "category": "Support"
            },
            {
                "id": 22,
                "question": "Do you have a knowledge base or documentation?",
                "answer": "Yes! We maintain an extensive knowledge base with tutorials, API docs, video guides, and community forums. Over 500 articles cover everything from getting started to advanced configurations.",
                "category": "Support"
            },
            {
                "id": 23,
                "question": "Can I get a dedicated account manager?",
                "answer": "Enterprise plan customers receive a dedicated account manager, priority support queue, and quarterly business reviews to ensure your infrastructure meets your evolving needs.",
                "category": "Support"
            },
            {
                "id": 24,
                "question": "How do I report a bug or request a feature?",
                "answer": "You can submit bug reports and feature requests through our support portal, community forum, or by emailing support@cloudhost.com. We review every submission and provide status updates.",
                "category": "Support"
            },

            # ── Deployment (6) ───────────────────────────────────────
            {
                "id": 25,
                "question": "How do I migrate my website to cloud hosting?",
                "answer": "Migration is simple! We provide: 1) Free migration service, 2) Step-by-step guidance, 3) 24/7 support. Most websites migrate within 24 hours with zero downtime.",
                "category": "Deployment"
            },
            {
                "id": 26,
                "question": "How do I manage my website files?",
                "answer": "You can manage files through FTP/SFTP access, a built-in File Manager in the control panel, or Git integration. SSH access is also available for command-line management.",
                "category": "Deployment"
            },
            {
                "id": 27,
                "question": "Can I integrate CI/CD pipelines?",
                "answer": "Yes! Our platform supports GitHub Actions, GitLab CI, Jenkins, CircleCI, and Bitbucket Pipelines. Push to your repo and deployments happen automatically.",
                "category": "Deployment"
            },
            {
                "id": 28,
                "question": "Do you support staging environments?",
                "answer": "Yes, you can create unlimited staging environments that mirror your production setup. Test changes safely before pushing them live with a single click or CLI command.",
                "category": "Deployment"
            },
            {
                "id": 29,
                "question": "Can I roll back a deployment?",
                "answer": "Absolutely. Every deployment is versioned. You can instantly roll back to any previous version from the dashboard or CLI, ensuring minimal disruption if something goes wrong.",
                "category": "Deployment"
            },
            {
                "id": 30,
                "question": "Do you support blue-green deployments?",
                "answer": "Yes! Our platform supports blue-green and canary deployment strategies out of the box. Route traffic gradually to a new version and switch instantly if everything looks good.",
                "category": "Deployment"
            },

            # ── Security (6) ─────────────────────────────────────────
            {
                "id": 31,
                "question": "Is cloud hosting secure?",
                "answer": "Yes, cloud hosting includes free SSL/TLS certificates, DDoS protection, automated backups, and a web application firewall. We comply with ISO 27001, SOC 2, and GDPR.",
                "category": "Security"
            },
            {
                "id": 32,
                "question": "Do you provide backups?",
                "answer": "Automatic daily backups are included on all plans. You can also create manual snapshots anytime. Backups are stored in geographically separate locations for disaster recovery.",
                "category": "Security"
            },
            {
                "id": 33,
                "question": "Do you offer two-factor authentication?",
                "answer": "Yes! We support 2FA via authenticator apps (Google Authenticator, Authy) and hardware security keys (YubiKey). We strongly recommend enabling 2FA for all accounts.",
                "category": "Security"
            },
            {
                "id": 34,
                "question": "How do you handle DDoS attacks?",
                "answer": "Our network includes always-on DDoS mitigation that can absorb attacks exceeding 1 Tbps. Malicious traffic is filtered at the edge before it reaches your servers, with zero impact on legitimate users.",
                "category": "Security"
            },
            {
                "id": 35,
                "question": "Are SSL certificates included?",
                "answer": "Yes, free Let's Encrypt SSL certificates are automatically provisioned and renewed for all domains. You can also upload your own custom certificates if needed.",
                "category": "Security"
            },
            {
                "id": 36,
                "question": "Do you comply with GDPR?",
                "answer": "Yes, we are fully GDPR compliant. We offer data processing agreements (DPAs), EU-based data center options, and tools for data export and deletion to meet your compliance requirements.",
                "category": "Security"
            },

            # ── Performance (6) ──────────────────────────────────────
            {
                "id": 37,
                "question": "Do you offer CDN services?",
                "answer": "Yes! Our built-in CDN spans 200+ edge locations worldwide. It automatically caches and serves your static assets from the nearest point of presence, dramatically reducing load times.",
                "category": "Performance"
            },
            {
                "id": 38,
                "question": "How fast are your servers?",
                "answer": "Our servers use the latest NVMe SSDs and high-frequency Intel/AMD CPUs. Typical response times are under 50ms within the same region, and our network backbone offers 25 Gbps throughput.",
                "category": "Performance"
            },
            {
                "id": 39,
                "question": "Do you offer load balancing?",
                "answer": "Yes! Managed load balancers distribute traffic across your instances using round-robin, least-connections, or IP-hash algorithms. Health checks automatically remove unhealthy nodes.",
                "category": "Performance"
            },
            {
                "id": 40,
                "question": "Can I monitor my application performance?",
                "answer": "We provide a built-in monitoring dashboard with real-time CPU, memory, disk, and network metrics. You can also set up custom alerts via email, Slack, or webhook when thresholds are exceeded.",
                "category": "Performance"
            },
            {
                "id": 41,
                "question": "Do you support caching solutions?",
                "answer": "Yes! We offer managed Redis and Memcached for in-memory caching. Our CDN also supports full-page and asset caching with configurable TTLs and instant cache purging.",
                "category": "Performance"
            },
            {
                "id": 42,
                "question": "What is your network bandwidth limit?",
                "answer": "All plans include generous bandwidth with no hard caps. Basic plans start at 1 TB/month, and enterprise plans offer unlimited bandwidth. Overage charges are transparent and affordable.",
                "category": "Performance"
            }
        ]



    def _tokenize(self, text: str) -> List[str]:
        """Tokenize and clean text"""
        # Convert to lowercase and remove special characters
        text = text.lower()
        text = re.sub(r'[^\w\s]', '', text)
        
        # Tokenize
        if NLTK_AVAILABLE:
            tokens = word_tokenize(text)
        else:
            tokens = text.split()
        
        # Remove stopwords and apply stemming
        processed_tokens = []
        for token in tokens:
            if token not in self.stop_words and len(token) > 2:
                if self.stemmer:
                    token = self.stemmer.stem(token)
                processed_tokens.append(token)
        
        return processed_tokens

    def _preprocess_faqs(self):
        """Preprocess all FAQ questions"""
        self.processed_questions = [
            self._tokenize(faq["question"]) for faq in self.faq_database
        ]
        
        # Build TF-IDF vectors if sklearn is available
        if SKLEARN_AVAILABLE:
            questions = [faq["question"] for faq in self.faq_database]
            self.vectorizer = TfidfVectorizer(
                lowercase=True,
                stop_words='english',
                analyzer='word',
                token_pattern=r'\w{2,}'
            )
            self.tfidf_matrix = self.vectorizer.fit_transform(questions)

    def _calculate_tf_idf(self, tokens: List[str]) -> Dict[str, float]:
        """Calculate TF-IDF weights for a list of tokens"""
        # Calculate term frequency
        tf = Counter(tokens)
        total_tokens = len(tokens)
        for token in tf:
            tf[token] = tf[token] / total_tokens
        
        # Calculate IDF
        idf = {}
        total_docs = len(self.faq_database)
        for token in set(tokens):
            docs_with_token = sum(1 for doc_tokens in self.processed_questions if token in doc_tokens)
            idf[token] = math.log(total_docs / (docs_with_token + 1))
        
        # Calculate TF-IDF
        tfidf = {}
        for token in tf:
            tfidf[token] = tf[token] * idf[token]
        
        return tfidf

    def _cosine_similarity_pure(self, vec1: Dict, vec2: Dict) -> float:
        """Calculate cosine similarity between two vectors"""
        all_keys = set(list(vec1.keys()) + list(vec2.keys()))
        
        dot_product = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in all_keys)
        mag1 = math.sqrt(sum(v**2 for v in vec1.values()))
        mag2 = math.sqrt(sum(v**2 for v in vec2.values()))
        
        if mag1 == 0 or mag2 == 0:
            return 0
        
        return dot_product / (mag1 * mag2)

    def _cosine_similarity_sklearn(self, user_question: str) -> Tuple[int, float]:
        """Calculate similarity using sklearn (faster for large datasets)"""
        user_vector = self.vectorizer.transform([user_question])
        similarities = cosine_similarity(user_vector, self.tfidf_matrix)[0]
        best_idx = similarities.argmax()
        return best_idx, float(similarities[best_idx])

    def find_best_match(self, user_question: str) -> Dict:
        """
        Find the best matching FAQ for user question
        
        Returns:
            Dict with keys:
            - match: The best matching FAQ (or None)
            - confidence: Confidence score (0-100)
            - all_matches: List of all matches sorted by score
        """
        if not user_question.strip():
            return {
                "match": None,
                "confidence": 0,
                "all_matches": []
            }
        
        # Use sklearn if available for better performance
        if SKLEARN_AVAILABLE and self.vectorizer:
            best_idx, similarity_score = self._cosine_similarity_sklearn(user_question)
            confidence = int(similarity_score * 100)
            
            if confidence >= 20:  # Minimum threshold
                return {
                    "match": self.faq_database[best_idx],
                    "confidence": confidence,
                    "matched_question": self.faq_database[best_idx]["question"]
                }
            else:
                return {
                    "match": None,
                    "confidence": 0,
                    "all_matches": []
                }
        
        # Fallback to pure Python implementation
        user_tokens = self._tokenize(user_question)
        if not user_tokens:
            return {
                "match": None,
                "confidence": 0,
                "all_matches": []
            }
        
        user_tfidf = self._calculate_tf_idf(user_tokens)
        
        best_match = None
        best_score = 0
        all_scores = []
        
        for idx, faq in enumerate(self.faq_database):
            faq_tokens = self.processed_questions[idx]
            faq_tfidf = self._calculate_tf_idf(faq_tokens)
            
            similarity = self._cosine_similarity_pure(user_tfidf, faq_tfidf)
            all_scores.append((similarity, faq))
            
            if similarity > best_score:
                best_score = similarity
                best_match = faq
        
        confidence = int(best_score * 100)
        all_scores.sort(reverse=True, key=lambda x: x[0])
        
        if confidence >= 20:
            return {
                "match": best_match,
                "confidence": confidence,
                "matched_question": best_match["question"],
                "all_matches": [(int(s[0]*100), s[1]) for s in all_scores[:3]]
            }
        else:
            return {
                "match": None,
                "confidence": 0,
                "all_matches": [(int(s[0]*100), s[1]) for s in all_scores[:3]]
            }

    def chat(self, user_input: str) -> str:
        """Simple chat interface"""
        result = self.find_best_match(user_input)
        
        if result["match"]:
            response = f"\n🎯 Answer (Confidence: {result['confidence']}%)\n"
            response += f"━" * 50 + "\n"
            response += result["match"]["answer"]
            response += f"\n\nMatched Question: {result['matched_question']}\n"
        else:
            response = "\n❌ No matching answer found.\n"
            response += "━" * 50 + "\n"
            response += "I couldn't find a relevant answer. Please try rephrasing your question or "
            response += "contact our support team for assistance.\n"
            
            if result["all_matches"]:
                response += "\n📌 Did you mean one of these?\n"
                for conf, faq in result["all_matches"]:
                    response += f"  • {faq['question']} ({conf}%)\n"
        
        return response


class FAQChatbotAPI:
    """Simple Flask API for the FAQ Chatbot"""
    
    def __init__(self):
        self.chatbot = FAQChatbot()
    
    def query(self, question: str) -> Dict:
        """
        Query the chatbot and return structured response
        
        Args:
            question: User's question
        
        Returns:
            JSON-serializable dictionary with answer and metadata
        """
        result = self.chatbot.find_best_match(question)
        
        return {
            "question": question,
            "answer": result["match"]["answer"] if result["match"] else None,
            "matched_faq_id": result["match"]["id"] if result["match"] else None,
            "matched_question": result.get("matched_question"),
            "confidence": result["confidence"],
            "found": result["match"] is not None,
            "suggestions": [
                {
                    "question": faq["question"],
                    "confidence": conf,
                    "id": faq["id"]
                }
                for conf, faq in result.get("all_matches", [])
            ]
        }


def create_flask_app():
    """Create Flask application (requires Flask installation)"""
    try:
        from flask import Flask, request, jsonify
        from flask_cors import CORS
        
        app = Flask(__name__)
        CORS(app)
        api = FAQChatbotAPI()
        
        @app.route('/api/query', methods=['POST'])
        def query():
            data = request.json
            question = data.get('question', '')
            
            if not question:
                return jsonify({"error": "No question provided"}), 400
            
            result = api.query(question)
            return jsonify(result)
        
        @app.route('/api/faqs', methods=['GET'])
        def get_faqs():
            # Optional category filter via query parameter
            category = request.args.get('category')
            if category:
                filtered = [faq for faq in api.chatbot.faq_database if faq.get('category') == category]
                return jsonify(filtered)
            return jsonify(api.chatbot.faq_database)

        @app.route('/api/categories', methods=['GET'])
        def get_categories():
            # Return list of unique categories
            categories = list({faq.get('category') for faq in api.chatbot.faq_database if faq.get('category')})
            return jsonify(categories)
        
        @app.route('/health', methods=['GET'])
        def health():
            return jsonify({"status": "healthy"})
        
        return app
    
    except ImportError:
        print("Flask not installed. Install with: pip install flask flask-cors")
        return None


def main():
    """Run interactive CLI chatbot"""
    print("\n" + "="*60)
    print("FAQ CHATBOT - Cloud Hosting Support")
    print("="*60)
    print("\nInitializing chatbot with NLP preprocessing...")
    
    chatbot = FAQChatbot()
    
    print(f"✓ Loaded {len(chatbot.faq_database)} FAQs")
    print(f"✓ NLP Pipeline: Tokenization, Stopword Removal, TF-IDF")
    print(f"✓ Matching Method: Cosine Similarity")
    
    if SKLEARN_AVAILABLE:
        print("✓ Using scikit-learn for optimized TF-IDF vectorization")
    else:
        print("✓ Using pure Python TF-IDF implementation")
    
    print("\n" + "-"*60)
    print("Type your questions below. Type 'quit' or 'exit' to leave.")
    print("-"*60 + "\n")
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() in ['quit', 'exit']:
                print("\n👋 Thank you for using FAQ Chatbot. Goodbye!")
                break
            
            response = chatbot.chat(user_input)
            print(response)
        
        except KeyboardInterrupt:
            print("\n\n👋 Chatbot terminated. Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {str(e)}\n")


if __name__ == "__main__":
    app = create_flask_app()
    app.run(debug=True)