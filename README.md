# Being's Discworld Armour Helper

An offline Mallard plugin styled like Being's Discworld Spell Library. Includes all 270 entries in the supplied wiki's Armours table, searchable by name, material, body part and clothing layer. Select an item to open its statistics, documented infobox facts, full article, and wiki source in a keyboard-accessible dialog. Custom Ug Ogg entries without individual articles retain the index's descriptions and statistics.

Install the `.mallardx` archive through Mallard's plugin manager. Connect to Discworld and type **coverage** in the normal MUD input. The plugin observes that exact command without overriding it or sending any commands. Recommendations appear in the Armour Helper panel. Repeat coverage after changing equipment. Data is cleared on disconnect and is never stored or sent elsewhere.

Choose balanced, sharp, pierce, blunt, or protection per pound. The advisor identifies documented armour from the output, tracks layer capacity (including multi-layer items), and greedily chooses additions that improve the best documented rating on body parts. It also offers same-layer replacements that preserve coverage. Additions form one proposed set; replacements are independent alternatives to currently worn pieces. This is an estimate, not a proof of optimal combat performance: enchantment, item condition, fitting, shields, strength, race, attack frequency, and interactions between stacked layers are not inferred. Unknown clothing is shown explicitly because its layer usage and protection cannot be established. Omitted body parts are not treated as confirmed bare. `coverage on ...`, `coverage of ...`, and `coverage unprotected` do not replace the equipment snapshot.

## Build and verify

```
python3 scripts/build.py
python3 -m unittest discover -s tests -v
```

The generated catalogue is bundled; no runtime network or Python dependencies are required. To refresh it from a backup, install `beautifulsoup4` and run:

```
python3 scripts/import_wiki.py /path/to/wiki
```

Code is MIT licensed. Wiki content remains under its original terms; see NOTICE and the source links.
