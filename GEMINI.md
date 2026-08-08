# Goat Farm Management System - Project Rules & Guidelines

# 1. Project Overview

Develop a **modern, professional, mobile-first web application** for managing a single goat farm.

This application is intended for **one farm and one primary user** (the farmer, with occasional use by the veterinarian on the same device if needed). It is **not** a commercial SaaS platform or enterprise management system.

The goal is to create a polished, production-quality application that is simple, fast, visually appealing, and easy to use on a mobile phone.

The application should feel like a professional product despite its small scope.

---

# 2. Project Scope

The application should allow the user to:

* Register and manage goats.
* Scan a barcode or QR code attached to a goat.
* Instantly open that goat's profile after scanning.
* Record health events, medication, vaccinations, milking, pregnancies, weight measurements, transfers, births, sales, deaths, and general notes.
* Display a complete chronological timeline for each goat.
* Visually manage six barn areas and assign goats between them.
* Search and filter goats quickly.

The application should remain focused on these features without unnecessary complexity.

---

# 3. Out of Scope

Do **not** implement:

* User authentication
* Login or registration
* Multiple users
* User roles
* Permissions
* Multi-farm support
* Backend servers (Node.js, Express, etc.)
* Offline mode
* LocalStorage
* IndexedDB

The application will always communicate directly with Supabase.

---

# 4. Technology Stack

## Frontend

* React
* Vite
* JavaScript
* Vanilla CSS

Use modern React practices and organize the project cleanly.

## Database

Use **Supabase** exclusively.

The frontend should communicate directly with Supabase using the JavaScript client.

No custom backend should exist.

## Hosting

The application must be deployable as a static website using GitHub Pages.

---

# 5. Design Philosophy

The design quality is a **top priority**.

The interface should look like a modern commercial application rather than a university project.

Aim for a clean, elegant, premium appearance with smooth spacing and consistent styling.

Avoid generic Bootstrap-style interfaces.

---

# 6. Color Palette

The visual identity should resemble nature and farming.

Primary colors:

* White (#FFFFFF)
* Farm Green (#2E7D32 or similar)

Secondary colors:

* Light Green
* Soft Gray
* Very Light Backgrounds

Use green only as an accent color rather than overwhelming the interface.

The UI should feel fresh, natural, and professional.

---

# 7. Visual Style

The application should include:

* Rounded cards
* Soft shadows
* Smooth hover effects
* Clean spacing
* Beautiful icons
* Subtle animations
* Modern buttons
* Elegant forms
* Professional dashboard cards

The overall aesthetic should resemble a modern dashboard rather than a traditional website.

---

# 8. Typography

Use a modern font such as:

* Inter (preferred)

Typography should emphasize readability, especially outdoors on mobile devices.

---

# 9. Mobile Experience

The application is mobile-first.

Requirements:

* Responsive layout
* Large touch targets
* Sticky bottom navigation
* Smooth scrolling
* Fast page transitions
* Comfortable spacing
* Excellent usability on Android and iPhone browsers

Desktop should also look polished but mobile takes priority.

---

# 10. Navigation

Main pages:

* Dashboard
* Scanner
* Goats
* Barn
* Settings

Navigation should be intuitive and require as few taps as possible.

---

# 11. Barcode Scanner

Use:

* html5-qrcode
  or
* @zxing/library

Requirements:

* Camera permission handling
* Manual barcode entry fallback
* Fast scanning
* Automatically open goat profile after successful scan

---

# 12. Goat Profile

Each goat profile should include:

* Photo
* Barcode / QR Code
* Name
* Breed
* Gender
* Birth Date
* Status
* Barn Area
* Notes
* Timeline

The profile should present information cleanly using cards and sections.

---

# 13. Timeline

Every important event should be stored as a timeline item.

Examples:

* Medication
* Vaccination
* Milking
* Weight
* Pregnancy
* Birth
* Transfer
* Sale
* Death
* General Notes

Display events in reverse chronological order using a modern vertical timeline.

Use icons and color accents to distinguish event types.

---

# 14. Barn Layout

Display six interactive barn areas.

Each area should show:

* Area name
* Number of goats

Selecting an area should display the goats assigned to it.

Assigning or moving goats between areas should be simple and intuitive.

---

# 15. Dashboard

Create a visually attractive dashboard showing summary information such as:

* Total Goats
* Healthy Goats
* Pregnant Goats
* Goats Under Treatment
* Upcoming Vaccinations
* Recent Timeline Activity

Present these using modern statistic cards.

---

# 16. Code Standards

Maintain a professional project structure.

Use reusable components.

Separate UI from business logic.

Avoid duplicated code.

Use descriptive variable and component names.

Write code that is easy to maintain and extend.

---

# 17. Performance

The application should:

* Feel smooth on mobile.
* Minimize unnecessary re-renders.
* Load quickly.
* Keep the codebase clean and organized.

---

# 18. Overall Goal

Every design and development decision should prioritize:

1. Professional appearance
2. Excellent user experience
3. Simplicity
4. Clean architecture
5. Maintainability

The final application should look polished enough that a real farm could use it daily, while remaining intentionally simple because it serves a single farm managed by one primary user.
