# 工析智枢： IndusInsight Hub User Manual

This manual explains the main workflows of the industrial data analysis agent platform, including login, resource browsing, agent creation, Skill and Tool management, knowledge bases, favorites, announcements, and profile management.

## 1. Platform Overview

The platform helps users build, manage, and run agents for industrial data analysis scenarios.

- Create and publish agents with multi-stage workflows.
- Submit natural-language requirements and data files in the agent workspace.
- Create and manage Skills, Tools, and knowledge bases.
- Browse public community resources and manage favorites.
- View announcements, profile information, account security, and usage statistics.

## 2. Quick Start

1. Open the platform and sign in.
2. Enter the dashboard.
3. Browse community resources or create your own resources.
4. Create an agent and bind the required Skills, Tools, and knowledge bases.
5. Open the agent workspace, upload data, enter the analysis requirement, and wait for results.

## 3. Account

You can sign in with an account password or a phone verification code. After signing in, use the user menu in the top navigation to open your profile, favorites, resources, or log out.

## 4. Workspace

The workspace provides quick access to agent creation, resource communities, personal resources, favorites, the user manual, and profile information.

In the top navigation, open **Community Resources** to choose **Skill Community** or **Knowledge Base Community**. **Agent Community** remains a separate link. On narrower screens, open the navigation menu at the top right; both resource communities appear directly under the Community Resources heading.

On pages with the top navigation, use the language button to the left of your avatar to switch languages: **English** switches to English and **中文** switches to Chinese. On the public homepage before sign-in, the button is next to **Log In**. The change takes effect immediately and is remembered after refreshing, while the current page and unsaved form input are preserved. Resource names, user input, and announcement content are not automatically translated. The sign-in page and agent workspace follow the selected language without adding their own language button.

### 4.1 Evaluation Dataset Downloads

After signing in, open **Evaluation leaderboard** from the top navigation and select a Case. Below the prediction submission instructions, find **Dataset** and click the download row to save `case1.zip`, `case2.zip`, or `case3.zip`. The download follows the selected Case.

Each ZIP contains the training, validation and test sets, a prediction template, and instructions. Downloading keeps your selected prediction CSV and does not count as a submission. Datasets remain available when submissions are closed or your submission limit has been reached. Retry if a download fails. Switching Cases or leaving the page cancels a pending download.

### 4.2 Filter the Leaderboard by Date

Use **Final submission date** below the leaderboard's Case title. Select both dates to filter automatically, or choose the last 7, 30, 90 days, or year. All ranges include both dates in Beijing time; “Last year” means 365 calendar days including today. Clear the field or select **Reset** to show all time.

The filter applies to each user's current final successful submission, then recalculates ranks among matching users. Earlier submissions are not substituted: a user whose final successful submission was in November does not appear in an October range. Failed attempts do not replace successful results. Submission counts and limits remain cumulative for the current Case and dataset version.

The same range is retained across Cases and stored in the page address for refresh, sharing, and browser back/forward navigation. Changing dates keeps your selected prediction CSV and any ongoing submission or dataset download. “My filtered result” indicates when your final submission is outside the range. An empty result includes a link to clear the filter.

## 5. Resources

The community pages let you search, sort, view, favorite, and open public agents, Skills, Tools, and knowledge bases. Personal pages let you manage resources you created.

## 6. Agent Workspace

In the agent workspace, you can start a new session, upload files, enter requirements, view streaming progress, respond to approval prompts, and download generated deliverables after completion.

## 7. Profile

The profile page lets you update your avatar, change your password, view account security details, and inspect recent activity. Use the language button in the top navigation to switch between Chinese and English UI modes.

To change your display name, select **Change Username** on your profile card, enter the new name, and select **Save**. Names may be shared by multiple users. After trimming surrounding spaces, a name must contain 1–50 Unicode code points; Chinese, English and emoji are supported, while line breaks and control characters are rejected.

Your profile, top user menu and dashboard card update after saving, and the name persists after refreshing. Your login account stays the same; no SMS verification or sign-in is required. Author names update when resource data is reloaded. If saving fails, your input is kept so you can retry.
