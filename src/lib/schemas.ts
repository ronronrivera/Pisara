import { z } from 'zod'

// Mirrors the CHECK constraint on profiles.display_name.
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a name so others know who’s drawing.')
  .max(40, 'Keep it to 40 characters or fewer.')

// Mirrors the CHECK constraint on boards.title.
export const boardTitleSchema = z
  .string()
  .trim()
  .min(1, 'Give the board a name.')
  .max(80, 'Keep it to 80 characters or fewer.')
