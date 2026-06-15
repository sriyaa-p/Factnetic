# FACTNETIC Production Deployment Guide

This document outlines the steps required to deploy the **FACTNETIC** application to Vercel and Google Cloud Run.

---

## 1. Deploying to Vercel (Serverless)

Vercel detects the `vercel.json` file in the root directory and serves the Express app using serverless functions.

### Step-by-Step Vercel Deployment

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Run Vercel Command**:
   In the root of the project, run:
   ```bash
   vercel
   ```
   Follow the prompts to link the project and deploy it.

3. **Configure Environment Variables**:
   In the Vercel Dashboard under **Project Settings > Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `USE_MOCK_DATA`: `false` (set to `true` if you want to bypass API billing and use offline mock data).
   - `NODE_ENV`: `production`
   - `CACHE_TTL`: `86400` (value in seconds, e.g., 24 hours).

4. **Production Release**:
   ```bash
   vercel --prod
   ```

---

## 2. Deploying to Google Cloud Run (Containerized)

Google Cloud Run scales dockerized containers automatically. A production-ready `Dockerfile` is provided in the repository.

### Step-by-Step Google Cloud Run Deployment

1. **Set Up Google Cloud SDK**:
   Install and authenticate with the `gcloud` CLI:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Build and Submit Container to Artifact Registry**:
   Run the following command to build the image using Google Cloud Build:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/factnetic
   ```
   *(Replace `YOUR_PROJECT_ID` with your actual Google Cloud Project ID).*

3. **Deploy to Cloud Run**:
   Deploy the newly built container image:
   ```bash
   gcloud run deploy factnetic \
     --image gcr.io/YOUR_PROJECT_ID/factnetic \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

4. **Add Environment Variables**:
   Update your Cloud Run service configuration to inject the required environment variables:
   ```bash
   gcloud run services update factnetic \
     --set-env-vars GEMINI_API_KEY="your_actual_gemini_api_key" \
     --set-env-vars USE_MOCK_DATA="false" \
     --set-env-vars NODE_ENV="production" \
     --set-env-vars CACHE_TTL="86400"
   ```
