# Import.io Studio concept

An interactive product-direction prototype for a prompt-first, evidence-backed web-data workspace.

This is an independent static concept, not an official Import.io release. It uses sample data, makes no extraction or API calls, and does not store credentials.

## What to review

- Prompt-first and guided workflow setup
- Reviewable plans, execution progress, evidence, and structured results
- Research, extraction, dataset-building, and monitoring workflows
- Pipelines, runs, datasets, monitors, webhooks, usage, and developer setup
- CSV, existing-dataset, live-web discovery, prior-research, and runtime inputs

The concept explores how browser-agent flexibility can become a dependable data product: users describe an outcome, inspect the proposed work, watch execution, and retain evidence with every result.

## Run locally

Open `index.html` directly, or serve this directory:

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173/`.

## Review questions

1. Is the product objective clear within 30 seconds?
2. Does the prompt-first flow, followed by a reviewable plan, create enough trust?
3. Are workflows, pipelines, runs, datasets, and monitors differentiated clearly?
4. Is execution visibility useful without becoming distracting?
5. Which backend capability should be validated first?

## Prototype limits

- Static sample content only
- Search indexing is explicitly disabled (`noindex, nofollow`); share the live URL directly with reviewers
- No live extraction, authentication, persistence, billing, or external API calls
- Developer credentials and webhook secrets are illustrative placeholders
- Import.io branding is used solely to make the internal product discussion concrete; obtain permission before public promotion
