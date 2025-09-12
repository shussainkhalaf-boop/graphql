# 01 Dashboard

## Overview

This project demonstrates the power of GraphQL by creating a dynamic user profile page that interacts with a GraphQL API. The application features user authentication, data visualization, and a user-friendly interface to display insights into a user's journey and achievements. The project emphasizes mastery of GraphQL queries, authentication, and interactive data visualizations.

---

## Features

### **Login and Authentication**

- Secure login using email or username and password.
- JWT-based authentication to enable secure API access.
- Logout functionality to manage user sessions.
- Error handling for invalid credentials with descriptive messages.

### **Dynamic Profile Page**

- Displays essential user details:
  - Basic information: User ID, email, and username.
  - Achievement metrics: XP, skills, and audits.
  - Progression level with a descriptive title.
- Fetches data dynamically from a GraphQL API using:
  - Basic queries.
  - Nested queries.
  - Parameterized queries.

### **Interactive Data Visualizations**

- **XP Progression Graph**: Displays XP growth over time using line charts.
- **Audit Overview**: Visualizes pass/fail ratios with bar charts.
- **Technical Skills Radar**: Highlights strengths across various skills using radar charts.
- Fully responsive and interactive SVG-based graphs created using `Recharts`.

### **Hosting**

- The application is deployed on **Vercel**, ensuring fast and seamless access.

---

## Technologies Used

### **Frontend**

- React.js: Component-based UI development.
- Recharts: For interactive SVG graphs and visualizations.

### **Backend**

- GraphQL: To query and retrieve data dynamically.
- JWT: For secure user authentication and session management.
- Axios: For API requests and responses.

### **Hosting**

- Vercel: Fast, modern hosting platform for the application.

---

## GraphQL Queries

The application utilizes various GraphQL query techniques:

- **Basic Queries**: Fetching straightforward data such as user details.
- **Nested Queries**: Retrieving related data like audits associated with user projects.
- **Parameterized Queries**: Filtering specific data, e.g., transactions of a certain type.

### Key Queries:

- **Fetch User Info**: Retrieves user details like ID, login, and email.
- **Fetch Transactions**: Displays XP data and project-related achievements.
- **Fetch Total XP**: Aggregates and calculates the total XP earned.
- **Fetch Skills**: Shows technical skills and proficiency levels.
- **Fetch Audit Statistics**: Visualizes audits with pass/fail statistics.

---

## Key Graphical Visualizations

- **XP Progression**: A line chart showing XP growth over time, highlighting user milestones.
- **Audit Pass/Fail Ratio**: A bar chart comparing successful and failed audits.
- **Skills Radar Chart**: A radar chart visualizing user strengths across various technical skills.

---

## How to Run Locally

1. **Clone the Repository:**

   ```bash
   git clone https://learn.reboot01.com/git/skhalaf/graphql.git
   cd your-repository-folder
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Start the Development Server:**

   ```bash
   npm run dev
   ```

---

## Deployment

The application is deployed on **Vercel** for easy access:

- [Live Application]()

---

## Learning Objectives

This project helps in mastering the following concepts:

- **GraphQL Query Language**: Using various querying techniques to fetch data dynamically.
- **JWT Authentication**: Securing API access and managing user sessions.
- **Data Visualization**: Creating interactive and meaningful graphs using Recharts.
- **UI/UX Design**: Designing a responsive and user-friendly interface.
- **Hosting**: Deploying a modern web application on Vercel.

---

## Author

- Developed by **Ali Hasan Jasim** for **Reboot01**.
