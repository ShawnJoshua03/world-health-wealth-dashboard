World of Data: Health and Wealth
Motivation and Theme

For this project, I wanted to explore the relationship between economic prosperity and public health outcomes across countries. Instead of looking at static graphs, I built an interactive dashboard that allows users to actively explore how GDP per person relates to life expectancy and under five mortality rate.

The central question guiding this project was simple but powerful: how strongly is wealth connected to health at a global scale? I chose GDP per capita as a proxy for economic strength and paired it with two health indicators to explore both positive and negative relationships. The goal was to create a tool that allows users to see distributions, correlations, and geographic patterns all at once, rather than in isolation.

Data

All data was sourced from Our World in Data.

Data source: https://ourworldindata.org

The three quantitative country level measures used in this project were:

• GDP per capita (2022)
• Life expectancy at birth (2022)
• Under five mortality rate (2022)

I downloaded the datasets as CSV files and used Python to preprocess them. The preprocessing step filtered each dataset to the most recent common year and merged them using the country code field. I also removed non country entries and ensured only valid three letter ISO country codes remained so they would correctly align with the world GeoJSON file.

The final dataset used in D3 contains:

• Country name
• Country code
• GDP per person
• Life expectancy
• Under five mortality rate

This cleaned dataset is loaded dynamically into the dashboard and drives all visualizations.

Design and Layout

Before writing any code, I sketched a dashboard layout. I wanted all related visualizations to be visible at the same time so that comparisons would be immediate and intuitive.

The final layout includes:

• Two histograms to show distributions
• A central scatter plot to show correlation
• Two choropleth maps to show geographic patterns
• Dropdown controls to switch measures
• A linked information panel

This dashboard format was intentional. Since brushing and linking were required, keeping everything visible without scrolling makes interactions feel seamless.

Visualization Components and Interactions
Histograms

The histograms display the distribution of whichever measures are currently selected. They allow users to see how countries are spread across income and health ranges.

Users can brush horizontally across a histogram to select a value range. When a range is selected:

• The scatter plot updates to highlight only those countries
• The maps outline the same countries
• Non selected countries fade visually

Hovering over bars displays the value range and number of countries in each bin.

Scatter Plot

The scatter plot shows the correlation between the selected X and Y measures.

Users can:

• Drag a rectangle to select multiple countries
• Click to select a single country
• Hover to view exact values

Selections in the scatter immediately update both histograms and both maps. This coordinated multiple view design makes it easy to explore clusters and outliers.

Choropleth Maps

The maps display the currently selected measures spatially.

Sequential color scales were used:

• Blue for GDP
• Green for life expectancy
• Red for child mortality

I intentionally used different color scales to reinforce the meaning of each variable. For example, higher child mortality is shown with deeper red tones to reflect severity.

Clicking a country selects it and highlights it across all views.

Linked Interaction Design

All visualizations share a central selection state. When a user brushes or clicks in one view, the other views update immediately.

This coordinated linking allows users to:

• Select low income countries and see how they cluster geographically
• Select high mortality countries and observe their GDP distribution
• Explore regional patterns through interaction instead of static inspection

This was one of the more technically challenging aspects of the project but also the most powerful feature.

Findings and Insights

Using this dashboard, several strong patterns emerge.

First, GDP per person and life expectancy show a clear positive correlation. Wealthier countries consistently appear in the upper right of the scatter plot and are darker on both the GDP and life expectancy maps.

Second, GDP and under five mortality show a strong negative relationship. Countries with lower income levels tend to have significantly higher child mortality rates. This becomes especially clear when brushing low GDP ranges and observing the corresponding map highlights.

Third, there are strong regional clusters. Many Sub Saharan African countries cluster in lower GDP and higher mortality regions, while Western Europe and North America cluster in high income, high life expectancy regions.

These relationships become much more intuitive when interacting with the dashboard compared to viewing separate static charts.

Implementation and Process

This project was built using:

• D3.js version 7
• HTML and CSS for layout and styling
• Python for data preprocessing
• GitHub for version control
• Vercel for deployment

The application is structured around a centralized selection state. Whenever the selection changes, all visualizations are redrawn to maintain consistency and linkage.


Challenges and Future Work

One of the main challenges was managing interaction logic between brushing and clicking, especially within the scatter plot. Ensuring that brush overlays did not interfere with click selection required restructuring the event handling logic.

Another challenge was correctly aligning country codes between the dataset and the GeoJSON file.

If I were to extend this project further, I would:

• Add time varying data to allow users to explore changes over years
• Add a log scale toggle for GDP
• Add a color legend for each map
• Improve responsiveness for smaller screens

Use of AI and Collaboration

AI tools were used primarily for debugging D3 interactions and refining layout structure. All data processing, visualization design decisions, and final integration were completed independently.

Peer discussion was helpful in clarifying brushing logic and interaction expectations.
