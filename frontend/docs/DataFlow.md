# Data Flow

## Introduction
The data flow is a little bit complicated, because we combine three types of input:
- The users selected model [depends on loading avaialble, baked in models at build time, determines model output variable automatically]
- Parameters for the model (usually universal for now): date/time
- Map mode specific parameters (Viewport bounds / NUTS region level (hardcoded to 3 for now))

## Import: The multiple types of data (Grid(Cartesian)) and NUTS(Europe GeoJson objects) require different functions, rendering, but share a common flow in the service-chain in the earlier stage
The specific GRID or NUTS "ClimateQuery" request adjusts:
(A) The type of requests made - NUTS needs a region gejson data + /nuts API actual data request; Grid needs just the data as raw data points with derived factors from the Viewport (resolution, bounds), then processes it into visual grids on the frontend
(B) The Map layer component that gets rendered. Both types render a Leafelt Map (via ClimateMap); Grid mode renders a "Level Of Detail/Downscaling" grid layer, which is called AdaptiveGridLayer. The NUTs one renders MapLayers, which is Geojson with colours/hover value valued on the NUTS data. Each of these does further rendering kept separate from the other (e.g. rendering country borders)

And also output to:
(1) The legend which gets extremes derived from the raw data of either type in one flow that always updates in tandem with the map
(2) Global Loading state + Status modals (errors on loading/missing data for year)
(3) Meta information from the ClimateQuery for detailing on Screenshots

## Choice of Global/Map mode specific stores and hooks.
Because of this, outputs to 1 and 2 are harmonized in specific stores which are global (the data is simple, pretty much read only from the map, not a risk to make this global)
NUTS and Grid specific data are kept within hooks and proccessed there, to avoid exposing private data out of scope, and used directly for rendering

Or put another way: Our 3 outputs above are relatively mapMode agnostic/global. Our climatequery inputs (date, selected model) are also generally mode agnostic.
But the rendering is very specific, and has many derived attributes (boundries, resolution, viewport, zoom, hover information). To keep the flow clear, we make a deliberately fork for that data and "read-only" output rendering.
Common elements try to avoid any awareness of the map mode; for example, as discussed below, the Screenshot renders an image fo the Leaflet element itself; it is unaware of the mode.
Even if the screenshotting code one day needs mode-specific information, if that is passed as a ClimateQueryInput<SpecificModeImplementation>, then it only needs to read a variable and could
even accept a generic ClimateQuery and render conditionally to the mode. It keeps it very read only and moving one object about. Plus, as ClimateQuery is in the high level ClimateMap component, it can just be passed
into the screenshotting hook, without much complication.

## Extensibility:
Having the harmonized output to stores for common inputs(query inputs like date) and outputs(Global load states etc) is extensible:
If we want to add an "Optimistic climate data" scenario for a given model, then we can add this to ClimateQueryInput, and then add an outputed state
- so placing it in a similar place to mapMode (used for input, also readable for screenshot output) intuitively, but as this is not read for screenshot output as the screenshotting is actually designed to be completely independent of map mode (it renders the Leaflet map as an image from it's perspective, without knowing about any layers at all), it's own store/place alongside selected model (already used for screenshot)


## Example service-chain flow for Data:
### NUTS:
ClimateMap.tsx -> useClimateMapDataFlow -> useEuropeNutsData -> modelOutputLoader.loadEuropeNutsData(...) -> nutsDataService.fetchNutsData(...) -> /api/nuts_data -> RegionProcessor.processEuropeOnlyRegionsFromApi(...)
-> MapDataStore.setProcessedEuropeNutsRegions(...) + ModelOutputStore.setProcessedDataExtremes(...) -> MapLayers.tsx


### Grid:
 ClimateMap.tsx -> useClimateMapDataFlow -> useGridModeData -> modelOutputLoader.loadGridData(...) -> climateDataService.fetchClimateData(...) -> /api/cartesian -> ModelOutputStore.setRawModelOutputDataPoints(...) +
  ModelOutputStore.setProcessedDataExtremes(...) -> GridProcessingStore.setGridCells(...) -> AdaptiveGridLayer.tsx

### Service-chain flow for screenshot data to rendering with imaginary future Gridmode specific attribute in image:
ClimateMap.tsx -> build read-only ScreenshotOverlayData from current query state (selected model / date / optimism) + future Grid-only display attribute (for example current grid resolution)
-> useMapScreenshot(...) -> leaflet-simple-map-screenshoter.takeScreen("blob") -> canvas.drawImage(...) -> canvas.fillText(...) with shared query metadata +
future Grid-only overlay text -> browser download of final PNG
