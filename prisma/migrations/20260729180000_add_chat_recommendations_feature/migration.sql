-- Chat recommendation cards are now produced by a separate constrained call
-- rather than a fenced JSON block inside the reply. Log its spend distinctly.
ALTER TYPE "AiUsageFeature" ADD VALUE IF NOT EXISTS 'chat_recommendations';
