import pandas as pd
import requests

# 1. Load your Excel file
input_file = "links.xlsx"
df = pd.read_excel(input_file)

# Update this to match the name of the column containing your URLs
url_column = "Live Link"


def check_link(url):
    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return "Invalid URL Format"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
    }

    try:
        # Send a quick request to verify the link
        response = requests.head(
            url, timeout=5, allow_redirects=True, headers=headers
        )

        # Fallback to GET if server blocks HEAD requests
        if response.status_code == 405:
            response = requests.get(
                url, timeout=5, allow_redirects=True, headers=headers
            )

        if response.status_code == 200:
            return "Active (200)"
        else:
            return f"Broken ({response.status_code})"

    except requests.exceptions.Timeout:
        return "Timeout"
    except requests.exceptions.ConnectionError:
        return "Unreachable / Down"
    except Exception as e:
        return f"Error: {str(e)}"


# 2. Check each URL in the file
print("Checking links...")
df["Status"] = df[url_column].apply(check_link)

# 3. Save the results back to a new Excel file
df.to_excel("checked_links.xlsx", index=False)
print("Done! Saved results to 'checked_links.xlsx'")