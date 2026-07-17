# Nutrilens: A Personalized Vision-Language Framework for Food Label Safety Analysis and Allergen-Aware Recommendations

**Draft for IEEE Conference Submission**  
*All sections verified against production source code. No fabricated components.*

---

## Ground-Truth Feature Audit (Pre-Writing Verification)

| Component | Implemented? | Source File | Notes |
|---|---|---|---|
| Gemini 2.5 Flash VLM (label extraction) | ✅ YES | `backend/src/routers/label.py:115` | Core analysis engine |
| XGBoost risk classifier | ✅ YES | `backend/src/services/model.py:26` | 10-feature, 3-class |
| SHAP TreeExplainer | ✅ YES | `backend/src/services/model.py:27` | Full feature attribution |
| SHAP bar chart (frontend) | ✅ YES | `frontend/src/components/ShapChart.jsx` | Chart.js visualization |
| Personalized allergen detection | ✅ YES | `backend/src/routers/label.py:16–26` | Prompt injection + response field |
| User health profile (age, BMI, diabetes, heart_disease, hypertension) | ✅ YES | `backend/src/routers/auth.py:18–22` | Stored in MongoDB |
| BMI auto-calculation from height/weight | ✅ YES | `frontend/src/pages/signup.jsx:34–48` | Client-side |
| Allergen-filtered Amazon product retrieval | ✅ YES | `backend/src/services/amazon_search.py` | Via SearchApi.io |
| Purchase history tracking | ✅ YES | `backend/src/routers/recommendations.py:46–100` | MongoDB |
| React frontend (camera + file upload) | ✅ YES | `frontend/src/pages/home.jsx` | Dual input |
| MongoDB Atlas persistence | ✅ YES | `backend/src/database.py` | Two collections |
| BCrypt authentication | ✅ YES | `backend/src/routers/auth.py:41` | No JWT |
| Nutrition extraction (sugars, kcal, sodium, sat. fat) | ✅ YES | `backend/src/routers/label.py:36–56` | From VLM JSON output |
| Graph Neural Networks | ❌ NO | — | Not implemented |
| FoodOn / ontology integration | ❌ NO | — | Not implemented |
| RAG / vector retrieval | ❌ NO | — | Not implemented |
| Traditional OCR (Tesseract) | ❌ NO (production) | `backend/test/ocrTest.py` | Test only |
| JWT authentication | ❌ NO | — | Uses localStorage |
| Collaborative filtering | ❌ NO | — | Not implemented |
| PDF export | ❌ NO | — | Not implemented |

---

---

# Section 1 — Introduction

Food product labels represent the primary interface through which consumers access ingredient and nutritional information. However, the complexity of modern food formulations — which routinely contain dozens of additive codes, allergen declarations in varied formats, and nutritional claims of differing regulatory standards — renders label interpretation practically inaccessible to the average consumer [CITE: food label literacy study]. This accessibility gap carries material health consequences: an estimated 220–520 million individuals worldwide suffer from food allergies, and unintentional allergen exposure from misread or misunderstood labels constitutes a leading cause of preventable anaphylactic events [CITE: WHO/Lancet food allergy epidemiology]. Beyond allergic risk, the systematic consumption of nutritionally inappropriate products is a recognized driver of diet-related non-communicable diseases, including type 2 diabetes, hypertension, and cardiovascular disease [CITE: ultra-processed food NCD burden].

Existing digital tools for food label interpretation fall into two broad categories. The first comprises barcode-lookup systems that cross-reference a product identifier against a static nutritional database [CITE: Open Food Facts, USDA FoodData Central]. While practical for catalogued mainstream products, these systems are fundamentally constrained by database coverage and do not support real-time analysis of novel, imported, or private-label products. The second category employs optical character recognition (OCR) pipelines to extract raw text from label images, subsequently applying rule-based or keyword-matching heuristics for allergen detection [CITE: OCR food label papers]. These approaches handle text extraction adequately but lack the semantic reasoning required to (a) infer ingredient risk from the interaction of multiple components, and (b) personalize risk assessment to an individual's health profile. Critically, neither category integrates user-level health context — metabolic conditions, body composition, or diagnosed comorbidities — into the analysis loop.

The emergence of Vision-Language Models (VLMs) offers a new paradigm for food label understanding. Unlike traditional OCR, VLMs process an image holistically, reasoning over visual layout, ingredient hierarchy, and semantic content simultaneously [CITE: VLM document understanding]. However, direct VLM output is probabilistic and does not, by itself, constitute a personalized risk score grounded in clinical factors. A user with diagnosed diabetes faces materially different risks from a high-sugar product than a metabolically healthy individual, yet existing VLM-based food analysis systems treat all users identically.

This paper presents **Nutrilens**, a personalized food safety analysis framework that addresses these limitations through a two-stage computational pipeline. In the first stage, Google Gemini 2.5 Flash processes a product label image and returns a structured JSON representation containing the ingredient list, detected allergens, per-serving nutritional values (total sugars, calories, sodium, saturated fats), and ingredient-level safety annotations. In the second stage, extracted nutritional features are combined with the user's stored health profile — comprising age, body mass index (BMI), and binary indicators for diabetes, hypertension, and heart disease — to form a ten-dimensional feature vector, which is passed to a pre-trained XGBoost classifier that outputs a three-class risk score (safe / moderate risk / severe risk). SHapley Additive exPlanations (SHAP) are computed for each prediction, providing feature-level attribution that identifies which nutritional or health factors drove the risk assessment. When a user requests safer alternatives, the system queries Amazon's grocery catalogue via an external search API, filtering results against the user's registered allergen list before surfacing recommendations.

**The principal contributions of this work are:**

1. A **multi-stage food safety analysis pipeline** integrating VLM-based structured label extraction with health-contextualized ML risk classification, enabling personalized analysis that neither component achieves in isolation.
2. A **health-aware feature encoding scheme** that jointly embeds per-product nutritional data with user-specific clinical indicators (age, BMI, diabetes, hypertension, heart disease) within a single feature vector for gradient-boosted risk classification.
3. **Explainable risk attribution** via SHAP TreeExplainer, surfacing the specific nutritional and health features driving each prediction — absent from existing consumer food safety applications.
4. A **personalized allergen-filtered product retrieval module** leveraging the user's registered allergen profile to retrieve and pre-filter commercially available safer alternatives in real time.
5. A **fully operational end-to-end web prototype** supporting camera-based and file-upload label capture, user authentication, health profile management, and purchase history tracking.

The remainder of this paper is organized as follows. Section II reviews related work. Section III formalizes the problem. Sections IV–VI describe methodology, architecture, and workflow. Section VII provides mathematical formulation. Section VIII details implementation. Sections IX–XII cover experimental setup, dataset, metrics, and results. Sections XIII–XVI discuss findings, limitations, future work, and conclusions.

---

# Section 2 — Related Work

## 2.1 Food Label Analysis and OCR-Based Approaches

Early work on automated food label processing relied on optical character recognition (OCR) engines such as Tesseract combined with dictionary-based ingredient matching [CITE: Tesseract OCR food label]. These systems demonstrated feasibility for text extraction but required well-lit, high-resolution images and post-processing heuristics to parse semi-structured ingredient lists. Subsequent work improved extraction accuracy through deep learning-based text detection (e.g., CRAFT, DBNet) [CITE: scene text detection], but allergen identification remained essentially a keyword-matching problem with no reasoning over ingredient combinations or user context.

Barcode-based approaches using public nutritional databases such as Open Food Facts [CITE] and USDA FoodData Central [CITE] offer an alternative pathway. These systems provide structured nutritional data for indexed products but are inherently limited to previously catalogued items and provide no personalized risk interpretation.

## 2.2 Vision-Language Models for Document and Food Image Understanding

The introduction of large multimodal models — including GPT-4V [CITE: OpenAI GPT-4V technical report], Google Gemini [CITE: Gemini paper], and LLaVA [CITE: LLaVA] — has transformed the landscape of visual document understanding. These models can extract structured information from images containing text, tables, and mixed layouts without task-specific fine-tuning, outperforming specialized OCR pipelines on diverse document types [CITE: document VLM comparison]. In the food domain, recent work has explored using LLMs and VLMs to identify food items from images [CITE: food image recognition LLM], but applications specifically targeting the structured extraction of ingredient lists and safety annotations from label images remain underexplored.

Nutrilens employs Gemini 2.5 Flash as the VLM backbone, specifically for its structured JSON output capability via constrained generation — a feature that simplifies downstream parsing and reduces prompt engineering overhead.

## 2.3 Personalized Nutrition and Health-Aware Dietary Systems

Personalized nutrition systems attempt to tailor dietary advice to individual characteristics. [CITE: Zeevi et al., 2015 — Personalized Nutrition by Prediction of Glycemic Responses] demonstrated that postprandial glucose responses to identical foods vary substantially between individuals, underscoring the inadequacy of population-level dietary guidance. Subsequent work has incorporated gut microbiome data [CITE], genetic markers [CITE], and wearable sensor readings [CITE] to build individualized nutritional models. However, these systems require extensive personal biomarker data and are not practical for point-of-purchase food safety assessment.

Nutrilens adopts a more pragmatic approach: the user's health profile is limited to clinically meaningful, self-reportable indicators (age, BMI, diabetes, hypertension, heart disease) that are widely available and do not require laboratory measurement. This design choice prioritizes deployability over biomarker completeness.

## 2.4 Machine Learning for Dietary Risk Assessment

Gradient boosting methods, particularly XGBoost [CITE: Chen and Guestrin, 2016], have demonstrated strong performance on tabular health data [CITE: XGBoost clinical applications], outperforming deep learning approaches when feature counts are limited and interpretability is required. Prior work has applied XGBoost to dietary risk prediction [CITE], chronic disease prediction from nutritional data [CITE], and food safety classification [CITE]. Nutrilens adapts this paradigm by constructing a feature vector that combines per-serving nutritional extraction (obtained from the VLM) with user health profile data, enabling a personalized risk score without requiring a large labeled dataset of individual user outcomes.

## 2.5 Explainable AI in Healthcare and Nutrition

The application of SHAP (SHapley Additive exPlanations) [CITE: Lundberg and Lee, 2017] to clinical and nutritional prediction models has been widely explored. SHAP TreeExplainer provides exact Shapley values for tree-based models in polynomial time, enabling feature-level attribution at inference time [CITE: SHAP TreeExplainer]. In consumer-facing health applications, explainability has been shown to increase user trust and adoption [CITE: XAI user trust healthcare]. Nutrilens embeds SHAP attributions directly into the user interface as an interactive bar chart, distinguishing it from black-box food scoring systems.

## 2.6 Allergen Detection Systems

Automated allergen detection from product labels has been studied using both rule-based and ML approaches [CITE: allergen NLP food labels]. Cross-referencing detected ingredient strings against structured allergen ontologies (e.g., FoodOn) has been proposed [CITE: FoodOn ontology] but requires significant data engineering overhead. Nutrilens takes a direct approach: the VLM is explicitly instructed to check detected ingredients against the user's registered allergen list and return matched allergens as a distinct structured field, leveraging the model's linguistic knowledge of ingredient synonyms and derivatives without requiring a separate ontology layer.

## 2.7 Gaps Addressed by This Work

Table 1 summarizes how Nutrilens compares to related systems.

| System | VLM Extraction | Personalized Health Profile | Explainable Risk Score | Allergen Filtering |
|--------|:--------------:|:---------------------------:|:----------------------:|:------------------:|
| Barcode DB systems [CITE] | ✗ | ✗ | ✗ | Partial |
| OCR + rule-based [CITE] | ✗ | ✗ | ✗ | Keyword only |
| Food image classifiers [CITE] | Partial | ✗ | ✗ | ✗ |
| Generic VLM food analysis [CITE] | ✓ | ✗ | ✗ | ✗ |
| **Nutrilens (this work)** | **✓** | **✓** | **✓** | **✓** |

---

# Section 3 — Problem Statement

## 3.1 Formal Problem Definition

Let $I$ denote a product label image and $\mathcal{U}$ the set of registered users. For each user $u \in \mathcal{U}$, a health profile is defined as:

$$\mathbf{h}_u = (\text{age}_u,\ \text{BMI}_u,\ d_u,\ c_u,\ p_u)$$

where $d_u, c_u, p_u \in \{0,1\}$ are binary indicators for diabetes, heart disease (cardiac conditions), and hypertension (high blood pressure), respectively. The user also maintains an allergen set $\mathcal{A}_u \subseteq \mathcal{A}$, where $\mathcal{A}$ is the universe of known food allergens.

Given an image $I$ and a user $u$, the system must:

1. **Extract** a structured product representation $\mathbf{p} = \{N, \mathbf{g}, \mathbf{R}, \mathcal{E}\}$ from $I$, where $N$ is the product name, $\mathbf{g} = (\text{sugars}, \text{kcal}, \text{sodium}, \text{sat\_fat})$ is the per-serving nutritional vector, $\mathbf{R}$ is a set of ingredient-level risk annotations, and $\mathcal{E}$ is the set of allergens detected in the product.

2. **Compute** a personalized risk score $r \in \{0, 1, 2\}$ (safe, moderate risk, severe risk) as a function of $\mathbf{g}$ and $\mathbf{h}_u$.

3. **Produce** a feature attribution vector $\boldsymbol{\phi}$ that decomposes $r$ into per-feature contributions.

4. **Detect** the user-specific allergen overlap $\mathcal{E}_u = \mathcal{E} \cap \mathcal{A}_u$ and issue a personalized warning.

5. **Retrieve** a ranked list of alternative products $\mathcal{P}^* \subseteq \mathcal{P}$ such that no product in $\mathcal{P}^*$ contains any allergen in $\mathcal{A}_u$.

## 3.2 Design Constraints

- The system must operate on commodity hardware with no local GPU requirement (all heavy inference is offloaded to cloud APIs).
- The user health profile must consist exclusively of self-reportable, non-laboratory indicators.
- Risk explanations must be surfaced to the end user in a human-interpretable format.
- Product retrieval must respect allergen constraints as a hard filter, not a soft preference.

---

# Section 4 — Proposed Methodology

The Nutrilens methodology comprises four tightly coupled stages: (1) multimodal label parsing, (2) health-contextualized risk prediction, (3) SHAP-based prediction explanation, and (4) allergen-constrained product retrieval.

## 4.1 Stage 1: VLM-Based Structured Label Extraction

A product label image $I$ is submitted to Google Gemini 2.5 Flash via the `google-generativeai` Python SDK. The model receives a composite input comprising the raw image (as a PIL `Image` object) and a structured system prompt $\pi$ that instructs the model to:

- Visually read all text visible on the label.
- Extract and list all ingredients.
- Extract per-serving nutritional values: total sugars (g), calories (kcal), sodium (mg), and saturated fats (g).
- Annotate identified ingredients with an ingredient-level risk classification (low / medium / high) drawn from established dietary risk associations, along with a justification string and safer ingredient alternatives.
- Enumerate all general allergens detected in the product.
- When a user allergen list $\mathcal{A}_u$ is provided in the prompt, cross-reference detected ingredients and return matched user allergens as a distinct field `user_allergens_detected`.
- Return all output strictly as a JSON object conforming to a predefined schema.

The structured prompt with user allergen injection is implemented in [`label.py:get_system_prompt()`](backend/src/routers/label.py:16). The VLM output is parsed from JSON, with markdown fence stripping applied as a preprocessing step to handle models that wrap JSON in code blocks.

## 4.2 Stage 2: Health-Contextualized Risk Prediction

From the VLM output and the user health profile, a ten-dimensional feature vector is constructed:

$$\mathbf{x} = (\text{age}_u,\ \text{BMI}_u,\ \text{sugars},\ \text{kcal},\ \text{sodium},\ \text{sat\_fat},\ d_u,\ c_u,\ p_u,\ |\mathcal{E}_u|)$$

where $|\mathcal{E}_u|$ is the count of user allergens detected in the product. This vector is passed to a pre-trained XGBoost gradient boosting classifier that returns a predicted risk class $\hat{r} \in \{0, 1, 2\}$ corresponding to safe, moderate risk, and severe risk, respectively.

Inputs are sanitized before prediction: list-typed values are unwrapped to scalars; missing values default to zero; the vector is cast to a strict `float64` numpy array to prevent type coercion errors in XGBoost.

## 4.3 Stage 3: SHAP-Based Prediction Explanation

A SHAP `TreeExplainer` is initialized on the XGBoost model at server startup. For each prediction, SHAP values are computed as:

$$\phi_i = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!\,(|F|-|S|-1)!}{|F|!} \left[ f_{S \cup \{i\}}(x_{S \cup \{i\}}) - f_S(x_S) \right]$$

where $F$ is the full feature set and $\phi_i$ is the marginal contribution of feature $i$ to the prediction. Features with $|\phi_i| > 0.001$ are returned to the frontend sorted by descending absolute impact, along with the raw input value for each feature. The frontend renders these as a horizontal bar chart with positive (risk-increasing) impacts coloured red and negative (risk-decreasing) impacts coloured green, implemented in [`ShapChart.jsx`](frontend/src/components/ShapChart.jsx).

## 4.4 Stage 4: Allergen-Constrained Product Retrieval

When a user requests safer product alternatives, a search query is constructed from the analysed product name and submitted to the Amazon grocery catalogue via the SearchApi.io REST API. The query includes negative keyword terms derived from the user's allergen list:

$$q = \texttt{"healthy } N \texttt{ alternative organic"} \cup \bigcup_{a \in \mathcal{A}_u} \texttt{"-} a \texttt{"}$$

A candidate pool of $2k$ results is retrieved (where $k$ is the requested limit), and each result is post-filtered by string-matching the product title and description against $\mathcal{A}_u$. Products containing any allergen string are discarded. The top $k$ allergen-clean products are returned with metadata (title, price, rating, Prime eligibility, Amazon URL).

---

# Section 5 — System Architecture

## 5.1 Component Overview

The Nutrilens system follows a three-tier architecture comprising a React single-page application (SPA) frontend, a FastAPI asynchronous backend, and cloud-hosted external services (MongoDB Atlas, Google Gemini API, SearchApi.io).

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ CameraCapture│  │  home.jsx    │  │  profile.jsx     │   │
│  │ (react-      │  │  (Analysis + │  │  (Health Profile │   │
│  │  webcam)     │  │   SHAP Chart)│  │   + History)     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (REST)
┌─────────────────────────▼───────────────────────────────────┐
│                   FastAPI Backend (Uvicorn)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  /auth      │  │/api/v1/label │  │/api/v1/recommen- │   │
│  │  (auth.py)  │  │(label.py)    │  │ dations/         │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │             │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌────────▼─────────┐   │
│  │  MongoDB    │  │  model.py    │  │ amazon_search.py  │   │
│  │  (database  │  │ (XGBoost +   │  │ (SearchApi.io)    │   │
│  │   .py)      │  │  SHAP)       │  │                   │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
  ┌───────▼───┐    ┌───────▼─────┐     ┌───────▼────────┐
  │ MongoDB   │    │  Google     │     │  SearchApi.io  │
  │  Atlas    │    │ Gemini 2.5  │     │  (Amazon)      │
  │ (Cloud)   │    │  Flash API  │     │                │
  └───────────┘    └─────────────┘     └────────────────┘
```

## 5.2 Backend Routers

Three FastAPI routers are registered on the application:

| Router | Prefix | Purpose |
|--------|--------|---------|
| `auth.py` | `/auth` | User registration, authentication, profile CRUD |
| `label.py` | `/api/v1/label` | Image ingestion, VLM analysis, ML prediction |
| `recommendations.py` | `/api/v1/recommendations` | Purchase tracking, history, product retrieval |

## 5.3 Database Schema

MongoDB Atlas hosts the `nutrilens` database with two collections:

**`users` collection:**
```json
{
  "_id": "ObjectId",
  "username": "String (unique)",
  "password": "Binary (bcrypt hash)",
  "name": "String",
  "allergens": ["String"],
  "age": "Number",
  "bmi": "Number",
  "diabetes": "Boolean",
  "heart_disease": "Boolean",
  "hypertension": "Boolean"
}
```

**`purchases` collection:**
```json
{
  "_id": "ObjectId",
  "username": "String",
  "product_name": "String",
  "analysis_data": { "...full VLM + ML output..." },
  "purchased_at": "ISODate",
  "allergens": ["String"],
  "ingredients": ["String"],
  "toxicology_risks": ["Object"]
}
```

## 5.4 Frontend Component Hierarchy

```
App.jsx (React Router)
├── Navbar.jsx
├── home.jsx          — Image capture/upload, analysis display,
│   ├── CameraCapture.jsx    SHAP chart, recommendation panel
│   └── ShapChart.jsx
├── signin.jsx        — Credential authentication
├── signup.jsx        — Registration + health profile + allergen selection
└── profile.jsx       — Profile editing, allergen management, purchase history
```

---

# Section 6 — Algorithm / Workflow

## Algorithm 1: Complete Analysis Pipeline

```
Input:  Image I, Username u (optional)
Output: AnalysisReport R

1.  Validate I (file type ∈ {JPEG, PNG, WebP}, size ≤ 10 MB)
2.  Read I_bytes ← raw bytes of I
3.  If u provided:
       Fetch user_profile ← MongoDB.users.find({username: u})
       Extract allergens A_u, age, BMI, diabetes, heart_disease, hypertension
    Else: A_u = [], health = zero vector

4.  Construct system_prompt π(A_u):
       If A_u ≠ ∅: inject allergen warning block into prompt
       Specify JSON schema for response

5.  image_pil ← PIL.Image.open(I_bytes)
6.  response ← Gemini2.5Flash.generate_content([π, image_pil])
7.  Strip markdown fences from response.text
8.  Parse JSON → p = {product_name, ingredients, nutrition, 
                       toxicology_risks, allergens, user_allergens_detected, 
                       confidence, summary}

9.  Extract nutrition vector: g = (sugars, kcal, sodium, sat_fat)
10. E_u = p.user_allergens_detected; |E_u| = len(E_u)

11. Build feature vector x = [age, BMI, sugars, kcal, sodium,
                               sat_fat, diabetes, heart_disease,
                               hypertension, |E_u|]
12. Sanitize x: unwrap lists, fill missing with 0.0, cast to float64

13. r̂ = XGBoostModel.predict(x)       // {0:safe, 1:moderate, 2:severe}
14. φ = SHAP.TreeExplainer.shap_values(x)[r̂]
15. Filter φ: keep entries where |φ_i| > 0.001
16. Sort φ by descending |φ_i|

17. Append to p: risk_prediction = {risk_level: r̂, 
                                     risk_category: label(r̂),
                                     shap_values: φ}
18. Append: user_allergens = A_u
19. Return p
```

## Algorithm 2: Allergen-Constrained Product Retrieval

```
Input:  Username u, current_product name N (optional), limit k
Output: Recommendations list P*

1.  Fetch A_u ← MongoDB.users.find({username: u}).allergens
2.  Fetch history ← MongoDB.purchases.find({username: u}).last(10)
3.  If N provided: query_base = N
    Elif history ≠ ∅: query_base = history[0].product_name
    Else: query_base = "healthy food"

4.  Build query q = "healthy {query_base} alternative organic"
5.  For each a ∈ A_u: append " -{a.lower()}" to q

6.  Request candidates C ← SearchApi.io(engine=amazon_search,
                                         q=q, num=2k, 
                                         department=grocery)
7.  P* = []
8.  For each product p ∈ C.organic_results:
        text = lower(p.title) + " " + lower(p.snippet)
        If ∀ a ∈ A_u: a.lower() ∉ text:
            Append p to P*
        If |P*| = k: break

9.  For each p ∈ P*:
        Generate reason string (allergen-free, rating, Prime status)
10. Return P*
```

---

# Section 7 — Mathematical Formulation

## 7.1 Feature Vector Construction

For a product with nutritional vector $\mathbf{g} = (g_1, g_2, g_3, g_4)$ representing per-serving sugars, calories, sodium, and saturated fats respectively, and a user health profile $\mathbf{h}_u = (\text{age}_u, \text{BMI}_u, d_u, c_u, p_u)$, and allergen match count $m_u = |\mathcal{E} \cap \mathcal{A}_u|$, the complete input feature vector is:

$$\mathbf{x} = [\text{age}_u,\ \text{BMI}_u,\ g_1,\ g_2,\ g_3,\ g_4,\ d_u,\ c_u,\ p_u,\ m_u] \in \mathbb{R}^{10}$$

## 7.2 XGBoost Risk Classification

The XGBoost classifier learns an ensemble of $T$ regression trees $\{f_t\}_{t=1}^T$. The raw prediction for class $k$ is:

$$\hat{y}_k = \sum_{t=1}^{T} f_t^{(k)}(\mathbf{x})$$

The final risk class is:

$$\hat{r} = \arg\max_{k \in \{0,1,2\}} \hat{y}_k$$

where class labels map as: $0 \mapsto \text{safe}$, $1 \mapsto \text{moderate\_risk}$, $2 \mapsto \text{severe\_risk}$.

## 7.3 SHAP Feature Attribution

For the predicted class $\hat{r}$, the SHAP attribution for feature $i$ is defined as:

$$\phi_i = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!\,(|F|-|S|-1)!}{|F|!} \left[ f_{S \cup \{i\}}(\mathbf{x}_{S \cup \{i\}}) - f_S(\mathbf{x}_S) \right]$$

The attributions satisfy the efficiency property:

$$\sum_{i=1}^{|F|} \phi_i = f(\mathbf{x}) - \mathbb{E}[f(\mathbf{X})]$$

meaning the sum of SHAP values equals the prediction's deviation from the expected model output. For the tree-based model, `TreeExplainer` computes exact SHAP values in $O(TLD^2)$ time, where $L$ is the maximum number of leaves per tree and $D$ is tree depth.

## 7.4 BMI Calculation

BMI is computed client-side from self-reported height $h$ (cm) and weight $w$ (kg):

$$\text{BMI} = \frac{w}{(h/100)^2}$$

This value is stored in the user profile and fed directly as the `bmi` feature in $\mathbf{x}$.

## 7.5 Allergen Overlap Computation

The allergen match count is computed as the intersection cardinality:

$$m_u = |\mathcal{E} \cap \mathcal{A}_u|$$

where $\mathcal{E}$ is the set of allergens returned by the VLM for the product, and $\mathcal{A}_u$ is the user's registered allergen set. The VLM performs the primary matching (leveraging its knowledge of ingredient synonyms and derivatives); $m_u$ is used as a scalar feature in the ML model.

---

# Section 8 — Implementation Details

## 8.1 Backend

The backend is implemented in Python 3.x using **FastAPI 0.119.0** with **Uvicorn 0.37.0** as the ASGI server. The three application routers are registered at server startup in [`app.py`](backend/src/app.py). CORS middleware is enabled with wildcard origins for development; production deployment should restrict this to specific domains.

**Database:** MongoDB Atlas is accessed via **PyMongo 4.6.0** with TLS/SSL certificate verification enforced using the `certifi` bundle. Two collections are used: `users` and `purchases`. No explicit indexes beyond the default `_id` index are currently defined.

**Authentication:** Passwords are hashed using **bcrypt 4.3.0** with per-user salt (`bcrypt.gensalt()`). Session state is maintained client-side via `localStorage` (username string). JSON Web Tokens (JWT) are not implemented in the current version.

**VLM Integration:** Google Gemini 2.5 Flash is accessed via the `google-generativeai 0.8.3` SDK. The model is initialized per-request as `genai.GenerativeModel('gemini-2.5-flash')`. The composite input `[system_prompt, PIL_image]` is passed to `generate_content()`. The model is configured to return JSON; markdown fence stripping is applied as a defensive post-processing step.

**ML Model:** The XGBoost classifier is loaded at server startup via `joblib.load()` from `backend/src/services/models/nutrilens_xgb_model.pkl`. If the model file is absent, the system degrades gracefully: label analysis continues but `risk_prediction` is set to `null` in the response. The SHAP `TreeExplainer` is initialized on the loaded model at the same time.

**Recommendation Service:** Amazon product search is performed via asynchronous HTTP requests using **HTTPX 0.28.1** to the SearchApi.io endpoint `https://www.searchapi.io/api/v1/search` with `engine=amazon_search`. The request timeout is 30 seconds. If the `SEARCHAPI_API_KEY` environment variable is not set, the recommendations endpoint returns HTTP 503.

## 8.2 Frontend

The frontend is a single-page application built with **React 19.1.1** and bundled with **Vite 7.1.7**. Client-side routing is handled by **React Router DOM 7.9.4** with four routes: `/` (home), `/signin`, `/signup`, `/profile`.

**Image Input:** Two input modes are available. Camera capture uses **React Webcam 7.2.0** (`react-webcam`) to access the device camera and capture a frame as a base64 data URL. File upload accepts JPEG, PNG, and WebP images up to 10 MB, converted to a data URL via `FileReader`. Both paths produce a data URL that is converted to a `Blob` and submitted as multipart form data.

**SHAP Visualization:** The `ShapChart` component renders SHAP attributions as a horizontal bar chart using **Chart.js 4.5.1** via **react-chartjs-2 5.3.1**. Bars with positive SHAP impact are coloured red (`rgba(220, 38, 38, 0.7)`); negative impact bars are coloured green (`rgba(16, 185, 129, 0.7)`). Tooltips display the raw feature value and a risk-direction label.

**Health Profile:** During registration (`signup.jsx`), the user provides age, height, and weight. BMI is computed in real time on the client as $w/(h/100)^2$ and displayed with a categorical label (Underweight / Normal / Overweight / Obese). The computed BMI is transmitted to the backend alongside the other health indicators.

**Allergen Selection:** The registration and profile pages present a grid of 12 common allergens (Peanuts, Tree Nuts, Milk, Eggs, Fish, Shellfish, Soy, Wheat, Gluten, Sesame, Sulfites, Mustard) as toggle buttons, with a free-text input for custom allergens. Selected allergens are submitted as a string array.

## 8.3 Environment Configuration

The backend requires three environment variables: `MONGO_URL` (MongoDB Atlas connection string), `GEMINI_API_KEY` (Google AI Studio API key), and `SEARCHAPI_API_KEY` (SearchApi.io key). Configuration is loaded via `python-dotenv`.

---

# Section 9 — Experimental Setup

**Note to authors:** *This section can only be completed once formal evaluation data is collected. The structure below describes the correct experimental setup to conduct.*

## 9.1 Evaluation Goals

The experimental evaluation addresses three research questions:

- **RQ1:** How accurately does the VLM extract ingredient lists and nutritional values from real product label images?
- **RQ2:** How effectively does the personalized allergen detection identify user-relevant allergens?
- **RQ3:** Does the allergen-constrained product retrieval correctly exclude allergen-containing results?

**Note:** The XGBoost risk classifier evaluation depends on the availability and labeling methodology of the training dataset, which must be described separately in Section 10.

## 9.2 Hardware and Software Environment

| Component | Specification |
|-----------|--------------|
| Backend server | Python 3.x, FastAPI 0.119.0, Uvicorn |
| ML inference | CPU-only (XGBoost), cloud API (Gemini) |
| Database | MongoDB Atlas M0 (free tier) |
| Frontend | Vite 7.1.7, React 19.1.1, Node.js |
| Image formats tested | JPEG, PNG, WebP |
| Max image size | 10 MB |

## 9.3 Evaluation Protocol for RQ1 (Ingredient Extraction)

Collect a set of $N$ product label images with manually verified ground-truth ingredient lists. For each image:
1. Submit to `/api/v1/label/analyze` without a username (unauthenticated, no allergen injection).
2. Compare extracted ingredient list to ground truth.
3. Compute token-level F1, exact-match accuracy, and nutritional value mean absolute error (MAE).

## 9.4 Evaluation Protocol for RQ2 (Allergen Detection)

For each product with known allergens:
1. Create a test user profile with the known allergens.
2. Submit the label image with the test username.
3. Check whether detected allergens in `user_allergens_detected` match ground truth.
4. Compute precision, recall, and F1 over allergen mentions.

## 9.5 Evaluation Protocol for RQ3 (Product Retrieval Filtering)

For a set of user profiles with varying allergen sets, request product recommendations and manually inspect the returned product titles and descriptions for allergen string presence.

---

# Section 10 — Dataset

**Note to authors:** *This is the most critical gap in the current paper. It must be addressed before submission.*

## 10.1 Evaluation Dataset (Label Images)

No publicly available benchmark dataset of food label images with ground-truth ingredient annotations was used in the current implementation. The test directory contains two prototype images (`test0.png`, `test1.png`).

**Required action:** To make quantitative claims, construct or use an existing dataset. Candidate public resources include:
- **ISIA Food-200 / FoodNet:** Food image datasets (product-level, not ingredient-label focused).
- **Open Food Facts image exports:** Contains product label photographs with structured ingredient data for cross-validation.
- **Manual annotation:** Photograph $N \geq 100$ commercially available product labels; annotate ingredient lists, allergens, and nutritional values manually as ground truth.

If a formal dataset evaluation is not feasible, the paper must be repositioned as a **system/demo paper** or **proof-of-concept study**, which is an accepted framing at IEEE CBMS, IEEE EMBC, or IEEE HEALTHCOM venues.

## 10.2 XGBoost Training Dataset

The training data and labeling protocol for the XGBoost risk classifier (`nutrilens_xgb_model.pkl`) must be fully disclosed. Required documentation:

- Source of training samples (synthetic, derived from USDA nutritional database, user-collected, or other).
- Labeling criteria: how were products labeled as safe (0), moderate risk (1), or severe risk (2)?
- Class distribution: how many samples per class?
- Feature statistics: mean and standard deviation of each of the 10 features in the training set.
- Train/validation/test split strategy.

Without this disclosure, the risk prediction component cannot be scientifically evaluated or reproduced.

---

# Section 11 — Evaluation Metrics

## 11.1 Ingredient Extraction (RQ1)

**Token-level F1:** Treating the ingredient list as a set of tokens, F1 measures the harmonic mean of extraction precision and recall against ground truth.

$$F_1 = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

**Nutritional MAE:** For each nutritional field $j \in \{\text{sugars, kcal, sodium, sat\_fat}\}$:

$$\text{MAE}_j = \frac{1}{N} \sum_{i=1}^{N} |g_j^{(i)} - \hat{g}_j^{(i)}|$$

**VLM Confidence Distribution:** Report the distribution of the model's self-reported confidence field over the evaluation set.

## 11.2 Allergen Detection (RQ2)

At the allergen mention level:

$$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}$$

$$F_1^{\text{allergen}} = \frac{2 \cdot P \cdot R}{P + R}$$

A false negative (missed allergen) has direct safety implications and should be weighted accordingly; Recall is therefore the primary metric.

## 11.3 Risk Classification (XGBoost, if ground truth available)

Standard multiclass metrics over the held-out test set:
- Accuracy, macro-averaged F1, confusion matrix.
- Per-class precision and recall for the `severe_risk` class (clinically most important).

## 11.4 Product Retrieval Allergen Compliance (RQ3)

$$\text{Compliance Rate} = \frac{\text{Recommendations without allergen string matches}}{\text{Total recommendations}} \times 100\%$$

---

# Section 12 — Results

**Note to authors:** *Quantitative results cannot be fabricated. This section must be completed after running formal evaluations as described in Section 9. The structure below shows exactly what to report once data is available.*

## 12.1 Ingredient Extraction Results

[To be completed after evaluation on N ≥ 100 label images]

Report: token-level F1 for ingredient extraction, MAE per nutritional field (sugars, kcal, sodium, saturated fats), VLM confidence distribution, and example qualitative outputs (correct vs. missed ingredients).

## 12.2 Allergen Detection Results

[To be completed after evaluation]

Report: precision, recall, F1 for allergen detection across user profiles with known allergen sets. Include confusion analysis for high-stakes allergens (peanuts, shellfish, gluten).

## 12.3 Risk Prediction Results

[Contingent on disclosure of XGBoost training dataset]

Report: classification accuracy, macro-F1, confusion matrix, and feature importance ranking (can use SHAP global importance as a complement to model weights).

## 12.4 Product Retrieval Compliance

[To be completed after evaluation]

Report: allergen compliance rate across user profiles with varying allergen sets; false-pass rate (allergen-containing products returned despite filtering).

## 12.5 System Latency

Report measured end-to-end response time for `/api/v1/label/analyze` (from HTTP request to JSON response), broken down into: image upload, Gemini inference, XGBoost inference, SHAP computation, and response serialization.

---

# Section 13 — Discussion

## 13.1 Strengths of the Approach

**Integration novelty.** The core technical contribution of Nutrilens is the integration of a VLM's structured extraction capability with a health-contextualized tabular ML classifier. This two-stage design cleanly separates the perceptual extraction problem (which the VLM handles well) from the personalized risk scoring problem (which requires structured numerical computation over health variables). Neither component alone achieves the combined output.

**Explainability.** The SHAP visualization directly addresses a known failure mode of consumer health applications: opaque scoring systems that provide risk labels without justification. By rendering feature-level attributions in the user interface, Nutrilens enables users to understand, for example, that their elevated risk score for a particular snack is driven primarily by its high sodium content in combination with their hypertension flag — an actionable insight not available from generic nutritional scores.

**Practical user profile design.** The five health indicators used in the feature vector (age, BMI, diabetes, hypertension, heart disease) are all self-reportable without clinical measurement, making profile collection feasible at consumer scale. The client-side BMI computation from height and weight further reduces the friction of profile setup.

**Hard allergen filtering.** The recommendation module treats allergen constraints as hard filters rather than soft ranking signals. This is the correct design for a safety-critical constraint: a peanut-allergic user must never receive a recommendation for a peanut-containing product, regardless of how highly it is rated.

## 13.2 Limitations of the Current Implementation

**VLM hallucination risk.** Large language models, including Gemini, are known to occasionally generate plausible-sounding but factually incorrect outputs [CITE: LLM hallucination survey]. In the context of ingredient extraction, this could manifest as invented ingredients, incorrect nutritional values, or false allergen assertions. The current system includes no validation layer to cross-check VLM output against a structured ingredient database. This is discussed further in Section 14.

**Allergen filtering is text-surface only.** The product retrieval filter checks only the product title and description string for allergen keywords. A peanut-containing product titled "Tropical Nut Mix" without the word "peanut" in the title would pass the filter. Full ingredient-level verification of recommended products is not implemented.

**Recommendation is retrieval, not recommendation.** The current implementation performs allergen-constrained keyword search on Amazon, not a recommendation algorithm in the machine learning sense. No collaborative filtering, content-based similarity, or user preference modelling is performed. Product ordering is governed by Amazon's default relevance ranking.

**Authentication security.** The system uses client-side `localStorage` for session management without JWT tokens, HTTPS enforcement, or session expiry. This is appropriate for a prototype but not for production deployment.

**Single language.** All UI text and VLM prompts are in English. Multi-language support is not implemented.

---

# Section 14 — Limitations

1. **No ground-truth evaluation dataset.** The system has not been formally evaluated against a labeled benchmark of food label images. All performance claims in the current work are qualitative. This is the most significant limitation for scientific credibility and must be addressed in future work or in a revision.

2. **XGBoost training provenance.** The training data, labeling criteria, and performance metrics of the XGBoost risk classifier are not publicly disclosed with the current system. Without this information, the risk prediction component cannot be independently reproduced or verified.

3. **VLM dependence on label image quality.** Gemini 2.5 Flash's extraction performance is sensitive to image resolution, lighting conditions, label font size, and label orientation. Images captured on low-quality cameras or featuring small-print ingredients may yield incomplete or inaccurate extractions.

4. **Binary health indicators are coarse.** The diabetes, hypertension, and heart disease flags are binary; they do not capture severity, treatment status, or specific sub-type (e.g., Type 1 vs. Type 2 diabetes). A user with well-controlled diabetes medicated to near-normal glycemic levels is treated identically to one with severe uncontrolled hyperglycemia.

5. **Allergen cross-contamination not modelled.** The system analyses declared ingredient allergens. Cross-contamination risk from shared manufacturing equipment ("may contain traces of…") is not extracted or modelled.

6. **No offline or caching capability.** Every analysis requires a live Gemini API call. There is no local caching of previously analysed products, barcode-indexed results, or offline fallback.

7. **Nutrient interaction effects not modelled.** The XGBoost model scores nutrients independently as features. Interaction effects (e.g., high sodium combined with high saturated fat, which compounds cardiovascular risk) are captured only implicitly through the tree structure, not through explicit interaction features.

---

# Section 15 — Future Work

1. **Formal benchmark evaluation.** Construct or adopt a standardized dataset of food label images with ground-truth ingredient lists, allergen annotations, and nutritional values. Conduct systematic evaluation of VLM extraction accuracy and allergen detection performance to produce quantitative claims.

2. **Real-time hallucination validation.** Integrate a secondary validation layer that cross-checks VLM-extracted ingredient lists and nutritional values against structured databases (e.g., Open Food Facts API, USDA FoodData Central) when the product can be identified by name or barcode.

3. **Ingredient-level verification of recommendations.** Extend the product retrieval module to fetch full ingredient lists for candidate products (where available via the Amazon product API or Open Food Facts) and perform ingredient-level allergen verification rather than title-string matching.

4. **Continuous health profile refinement.** Incorporate purchase history data into a lightweight user preference model that adapts product recommendations over time based on observed purchase patterns and analysis outcomes.

5. **Expanded health feature set.** Explore richer health profile representations, including specific dietary goals (weight loss, muscle gain), medically prescribed dietary restrictions (low-FODMAP, renal diet), and pregnancy-specific considerations, each representing a distinct risk context.

6. **Fine-tuned VLM for food labels.** Investigate fine-tuning or prompt-tuned specialization of a smaller open-source VLM (e.g., LLaVA, Qwen-VL) on a curated food label dataset to reduce API dependency, improve extraction consistency, and enable on-device inference.

7. **JWT-based authentication.** Replace the current `localStorage` session management with proper JWT-based authentication including token expiry and refresh mechanisms for production security.

8. **Cross-contamination risk modelling.** Extend the ingredient extraction schema to capture "may contain" advisory statements and model cross-contamination risk as a separate lower-severity allergen flag.

---

# Section 16 — Conclusion

This paper presented Nutrilens, a personalized food safety analysis framework addressing the challenge of accessible, individualized food label interpretation. The system integrates a Vision-Language Model (Google Gemini 2.5 Flash) for structured extraction of ingredient and nutritional information from product label images with a gradient-boosted classifier (XGBoost) for personalized risk prediction conditioned on user health profile data. Predictions are made interpretable through SHAP TreeExplainer, which computes feature-level attributions identifying the specific nutritional or health factors driving each risk score. An allergen-constrained product retrieval module surfaces safer commercial alternatives filtered against the user's registered allergen profile.

The principal technical contribution is the integration architecture that transforms an unstructured product image into a personalized, explainable health risk assessment — a capability not achievable by any individual component in isolation. The system is fully operational as a web prototype supporting dual-mode image capture, health profile management, purchase history tracking, and real-time allergen warnings.

Critical limitations of the current work include the absence of a formal labeled evaluation dataset and incomplete disclosure of the XGBoost training provenance. These represent the primary directions for future work, alongside ingredient-level verification of product recommendations and VLM hallucination mitigation. Despite these limitations, Nutrilens demonstrates the practical feasibility of combining vision-language intelligence with health-contextualized machine learning to deliver personalized, explainable food safety decision support at the point of consumption.

---

## Reference Guidance (Do Not Submit Without Real Citations)

| Slot | Topic | Where to Search |
|------|-------|----------------|
| Food label literacy | Consumer difficulty reading labels | *Food Policy*, *Public Health Nutrition*, *Appetite* |
| Food allergy epidemiology | Global allergy statistics | WHO reports, *J Allergy Clin Immunol*, *Lancet* |
| Diet-related NCDs | Ultra-processed food and chronic disease | *BMJ*, *Nutrients*, *NEJM* |
| Open Food Facts / FoodData Central | Barcode DB systems | Their official papers on *Scientific Data* |
| OCR food label analysis | Text detection on labels | *ICDAR*, *IEEE Access* |
| VLM document understanding | Multimodal structured extraction | *CVPR*, *NeurIPS*, *ACL* |
| Google Gemini | Gemini technical report | Google DeepMind, arXiv 2312.11805 |
| GPT-4V | OpenAI technical report | OpenAI, arXiv |
| LLaVA | Open VLM | *NeurIPS 2023*, arXiv 2304.08485 |
| XGBoost | Chen & Guestrin 2016 | *KDD 2016* |
| SHAP | Lundberg & Lee 2017 | *NeurIPS 2017* |
| SHAP TreeExplainer | Lundberg et al. 2020 | *Nature Machine Intelligence* |
| Personalized nutrition | Zeevi et al. 2015 | *Cell 2015* |
| LLM hallucination | Hallucination survey | *ACL* / arXiv surveys 2023–24 |
| XAI user trust healthcare | Explainability + trust | *JAMIA*, *CHI* |
| Allergen NLP detection | Text-based allergen detection | *Food and Chemical Toxicology*, *NLP4Health* |
