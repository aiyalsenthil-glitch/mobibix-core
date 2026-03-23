import os
import json

blog_dir = r"e:\Projects\gym-saas\apps\mobibix-web\content\blog"

for filename in os.listdir(blog_dir):
    if filename.endswith(".json"):
        filepath = os.path.join(blog_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if "date" in data and "2026-04" in data["date"]:
                    # Change 2026-04-XX to 2026-03-XX
                    # To keep them in order, we can map 04 to 03.
                    new_date = data["date"].replace("2026-04", "2026-03")
                    # If 2026-03-31 is today or past, it's fine.
                    print(f"Updating {filename}: {data['date']} -> {new_date}")
                    data["date"] = new_date
                    with open(filepath, 'w', encoding='utf-8') as fw:
                        json.dump(data, fw, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Error processing {filename}: {e}")
