import json

# Load the JSON data from the file
with open('preprocessed_yemen_market_data_beans_kidney_red.json', 'r') as file:
    data = json.load(file)

# Filter the data to include only entries from 2023
filtered_data = [entry for entry in data if entry['month'].startswith('2023')]

# Save the filtered data to a new JSON file
with open('filtered_yemen_market_data_2023.json', 'w') as file:
    json.dump(filtered_data, file, indent=4)

print("Filtered data saved to 'filtered_yemen_market_data_2023.json'")