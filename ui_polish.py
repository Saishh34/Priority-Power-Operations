import os
import glob
import re

def polish_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    orig_content = content

    # Upgrade Modals
    content = re.sub(
        r'<div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full overflow-y-auto">\s*<h2 className="text-xl font-semibold mb-4">([^<]+)</h2>',
        r'''<div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full">
            <div className="px-6 py-4 border-b shrink-0 bg-gray-50/50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-900">\1</h2>
            </div>
            <div className="p-6 overflow-y-auto">''',
        content
    )
    
    # Close the div wrapping the modal content before the form ends? No, let's just do a simpler fix for buttons.
    # Actually, I'll just rely on the manual replace I did for JobsClient.tsx earlier, but wait, I overwrote JobsClient modal when I ran the script because I replaced `fixed inset-0...` globally.
    
    # Let's fix buttons
    content = content.replace('px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50', 'px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium')
    content = content.replace('px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700', 'px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm')
    
    # Forms inside Employee App
    content = content.replace('className="bg-white text-gray-900 p-6 rounded-xl shadow-md border border-gray-100 space-y-4"', 'className="bg-white text-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 space-y-5"')
    content = content.replace('<h3 className="font-bold">', '<h3 className="font-semibold text-lg text-gray-800 border-b pb-3 mb-4">')

    # Improve labels
    content = content.replace('className="block text-sm font-medium text-gray-700 mb-1"', 'className="block text-sm font-medium text-gray-700 mb-1.5"')
    content = content.replace('className="block text-sm font-medium"', 'className="block text-sm font-medium text-gray-700 mb-1.5"')
    
    if content != orig_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Polished {filepath}")

if __name__ == "__main__":
    files = glob.glob('src/**/*.tsx', recursive=True)
    for f in files:
        polish_file(f)
