# Documentation on the API adaptiveStrategy mapping
# 
# This document explains the mappings between frontend adaptive strategies and backend expected values
# as implemented in the frontend API service.
#
# Frontend values:
# - 'progressive' - Questions gradually increase in difficulty
# - 'easy-first' - Start with easy questions
# - 'hard-first' - Start with difficult questions
# - 'random' - Random question selection
#
# Backend expected values:
# - 'adaptive' - Questions adapt based on performance
# - 'easy_to_hard' - Start with easy questions
# - 'hard_to_easy' - Start with difficult questions
# - 'random' - Random question selection
#
# The mapping implemented in the frontend API service:
# frontend 'progressive' -> backend 'adaptive'
# frontend 'easy-first' -> backend 'easy_to_hard'
# frontend 'hard-first' -> backend 'hard_to_easy'
# frontend 'random' -> backend 'random'
#
# Usage:
# When using the testsAPI.startTest method with adaptive options, the frontend uses its own terminology,
# and the API service will automatically map these values to what the backend expects.
#
# Example:
# ```typescript
# const adaptiveOptions = {
#   adaptive: true,
#   adaptiveStrategy: 'progressive' // Will be mapped to 'adaptive' for the backend
# };
# const response = await testsAPI.startTest(templateId, duration, adaptiveOptions);
# ```
