// -------------------- Regions of interest --------------------
var states = {
  'Penang':   ee.Geometry.Rectangle([100.15, 5.20, 100.50, 5.50]),
  'Selangor': ee.Geometry.Rectangle([101.15, 2.70, 101.90, 3.40]),
  'Johor':    ee.Geometry.Rectangle([103.10, 1.15, 104.10, 2.10]),
  'Sabah':    ee.Geometry.Rectangle([115.90, 5.00, 118.00, 6.30]),
  'Sarawak':  ee.Geometry.Rectangle([110.00, 1.20, 112.00, 2.50])
};

// -------------------- Dynamic World dataset --------------------
var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterDate('2024-01-01', '2025-05-01');

// NOTE: Kept 9 colors (0–8) but replaced Snow/Ice (#A59B8F) with Bare Ground red (#C4281B)
var viz = {
  bands: ['label'],
  min: 0,
  max: 8,
  palette: [
    '#419BDF', // 0 Water
    '#397D49', // 1 Trees
    '#88B053', // 2 Grass
    '#7A8737', // 3 Crops (DW has Flooded Veg in official; using your mapping)
    '#E49635', // 4 Shrub & Scrub
    '#DFC35A', // 5 Built-up / Urban
    '#C4281B', // 6 Bare ground
    '#C4281B', // 7 <-- replaced Snow & Ice color to avoid beige in MY context
    '#B39FE1'  // 8 Clouds (placeholder color to keep 9 entries)
  ]
};

// -------------------- UI Panel --------------------
var panel = ui.Panel({style: {width: '300px', position: 'top-left'}});
ui.root.add(panel);

var selectState = ui.Select({
  items: Object.keys(states),
  value: 'Penang',
  onChange: function(name) { updateMap(name); }
});
panel.add(ui.Label('1. Choose a State:'));
panel.add(selectState);

panel.add(ui.Label('2. Draw a shape on the map (polygon or rectangle).'));

// --- Buttons Row (Aligned) ---
var BTN_H = '36px';
var BTN_W = '140px';

var actionsRow = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {margin: '2px 0'}
});
panel.add(actionsRow);

var downloadButton = ui.Button({
  label: 'Download Drawn Area',
  style: {
    height: BTN_H,
    width: BTN_W,
    padding: '3px',
    fontSize: '12px',
    textAlign: 'center',
    margin: '0'
  },
  onClick: handleDownload
});

var clearButton = ui.Button({
  label: 'Clear Shape',
  style: {
    height: BTN_H,
    width: BTN_W,
    padding: '3px',
    fontSize: '12px',
    textAlign: 'center',
    margin: '0 0 0 5px'
  },
  onClick: clearShape
});

actionsRow.add(downloadButton);
actionsRow.add(clearButton);

panel.add(ui.Label('3. The JPG preview/link will appear below.'));
var previewContainer = ui.Panel({style: {margin: '8px 0'}});
panel.add(previewContainer);

var downloadLink = ui.Label('');
previewContainer.add(downloadLink);

// -------------------- Map + drawing tools --------------------
var drawingTools = Map.drawingTools();
drawingTools.setShown(true);
drawingTools.setDrawModes(['polygon', 'rectangle']);

function getLastDrawnGeometry() {
  var n = drawingTools.layers().length();
  if (n === 0) return null;
  var lyr = drawingTools.layers().get(n - 1);
  return lyr.getEeObject();
}

function clearShape() {
  // Remove all drawn layers
  while (drawingTools.layers().length() > 0) {
    drawingTools.layers().remove(drawingTools.layers().get(0));
  }
  // Reset preview + link
  previewContainer.clear();
  previewContainer.add(downloadLink);
  downloadLink.setValue('');
  // Re-show the download button (insert at index 0 to keep spacing)
  if (!actionsRow.widgets().contains(downloadButton)) {
    actionsRow.insert(0, downloadButton);
  }
}

// -------------------- Map layer update --------------------
function updateMap(name) {
  var region = states[name];
  var img = dw.filterBounds(region).mosaic().clip(region);
  Map.centerObject(region, 9);
  Map.layers().reset([ui.Map.Layer(img, viz, 'Dynamic World ' + name)]);
}

// -------------------- Download handler --------------------
function handleDownload() {
  var geometry = getLastDrawnGeometry();
  if (!geometry) {
    print('Error: No shape drawn. Please draw a polygon or rectangle first.');
    return;
  }

  var clipped = dw.mosaic().clip(geometry);

  // Visualize into RGB
  var renderImage = clipped
    .select('label')
    .visualize({
      min: viz.min,
      max: viz.max,
      palette: viz.palette
    });

  var url = renderImage.getThumbURL({
    region: geometry,
    dimensions: 1024,
    format: 'jpg'
  });

  // Hide the download button while preview is visible
  if (actionsRow.widgets().contains(downloadButton)) {
    actionsRow.remove(downloadButton);
  }

  // Show preview + link
  previewContainer.clear();
  var thumb = ui.Thumbnail({
    image: renderImage,
    params: {region: geometry, dimensions: 512, format: 'jpg'},
    style: {width: '100%', height: 'auto', margin: '0 0 8px 0'}
  });
  previewContainer.add(thumb);

  downloadLink.setValue('Save JPG');
  downloadLink.setUrl(url);
  previewContainer.add(downloadLink);
}

// -------------------- Initial --------------------
updateMap('Penang');
