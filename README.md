# heiplanet Frontend Mapping application


# Description
The heiplanet Mapping project shows the predictions and predicted susceptibility in the future of different diseases by Infectious disease/Climate models from the group, across different regions in the map.

This repository contains the frontend for the Climate Map. The user can browse for models with the Model Selector, and change the year to see future suspcetibility predictions

It can be configured to request and display NUTS3 regions, or worldwide equivalent regions, which is dependent upon the underlying model.

## Background context on the view types (technically specific)
For the worldwide view, the data is projected from individual points into Grids on the frontend; the country borders are a background layer.
The NUTS regions are processed on the backend. The NUTS regions meta data is parsed via an API from a backend. NUTS regions not in the meta data list, or without data, are not shown. The default NUTS level is NUTS3, but the backend supports providing different NUTS region levels.

## Example: NUTS3 regions version for WNV-R0(Shown via data from the small dataset mode):
<img width="3707" height="1933" alt="image" src="https://github.com/user-attachments/assets/a5709143-88ff-4f4a-9b28-99801570f376" />


## Example: Worldwide Grid Simple R0 example(Also from the small dataset mode):
<img width="3707" height="1933" alt="image" src="https://github.com/user-attachments/assets/c885efe1-4507-4c4a-88e5-27e7364ac963" />

## Main components diagram:
(New Diagram needed)

# Installation guide
- First, make sure the `onehealth-db` repository is running with the API accessible. It depends upon a running postgres database, typically docker name `my-postgres`. The API must be able to return generated data for 2016 and 2017.
- Run `pnpm i` to install dependencies
- Run `pnpm run dev` to launch the application

# Usage examples
The website can be used by visiting `http://localhost:5173/map`, which will present the user with two view modes.

You can also share the link directly to a specific view mode:
- Citizen: `http://localhost:5173/map/citizen`
- Expert:  `http://localhost:5173/map/expert`

# Support, contributing and authors
Create an issue in the repository.

# License
MIT, see LICENSE.md

# Project status
Deployed example as the [Hei-Planet Platform](http://platform.hei-planet.com/)

# Architecture explained
This app uses React and relies on a correspodning model data API backend.

Data flows through stores in react which are mostly like object oriented classes with getters-and-setters.
In this implementation, all stores are universal so if you import a store (via a "hook" technically) and run a setter value, it updates it in one place.
Many React Components, such as the grid cells, read and listen for changes to those store classes, to update when needed.
These components do not operate much logic themselves and just render HTML/CSS based on the variables provided. For example, the legend one shows min/max values according to the data which is saved in MapDisplayedDataStore, and locally available where the legend is in the  ClimateMap. It calculates the colours based on that too.

The main role of the app is to **render data from the API into a map**. The map uses Leafelt and renders either
NUTS (European Regions) data or grid data. This can load from the API to render suspectibility or other variables (e.g. R0 estimate)
for different infectious disease models with climate and population inputs.

# React Components
ClimateMap - contains these components:
> Top bar with Model and Map mode dropdowns (UserSelectionStore)
> Leaflet Map
>   > NUTSDataLayer(only one is active)
>   > GridDataLayer(only one is active)
>   > Floating map buttons (Screenshot, about model, info, go to users actual location)
> Legend (R0 estimate etc)
> Bottom bar with month+year + timeline(changes month)

Broadly speaking changes in the top bar / bottom bar trigger state changes.
The two layers in the map display the data
A state variable like mapMode changing from "NUTS" to "GRID" causes a new API request for that new map mode type of data
... using the same existing `model ID` and `model output variable`.

Those update the MapDisplayedDataStore, which when it changes rerenders the map layers and ClimateMap (and therefore as that changes the min/max data, the legend).

**Main data flow components**
UserSelectionQueryStore - a set of getter/setter properties in a store for the month/date/model
MapViewportInputStore - "Input" is key here - this is where the map is zoomed to (zoom amount + lat/lon) which is used for fetching data. It is connected to the leaflet map so when the user pans or zooms, it updates that information and calls useClimateDataLoader when change has been detected
MapDisplayedDataStore - handles and stores all final data that gets rendered - the provided NUTS regions, the actual data values for grids and NUTS data when applicable to be rendered in to the screen("viewport"). ClimateMap listens to this for min/max values to display the legend directly
useClimateDataLoader - sends/processes out for new map data
modelOutputLoader - Calls the API, processes the data into the final form (merging NUTS data for example), and puts it into the MapDisplayedDataStore.

Auxiliary/minor:
mapDataUtils - manages the Legend and keeping it consistent with the rendered data point colours on the map
useModelData - renders model data from last start up the webserver and this data can then be seen in the model viewer and is used for data queries (e.g. requested_variable_type only presently)

# To extend this repository with new features:

If you want to add more visual buttons or display data different I would edit the capital letter named React Components,
creating a new component which you can render with mock props to start off with and loading / listening to data from existing stores.

If you want to provide richer model output data, you need to edit the ClimateDataLoader and modelOutputLoader.

If you want the user to provide more input for the models, e.g. an optimistic or pessimistic alternative, you can add that in UserSelectionStore as a new input and pass that to the queries made to the API.

# Leaflet map logistical choices
For fast loading the map has two approaches:

(A) NUTS data: Since the Polygons are quite large, these are provided once by the backend, separate to the data. The data is merged later for rendering.
(B) Grid data: The frontend adjusts the resolution based on zoom so that there is never hundreds of thousands of grid cells data to render in one call. Additionally, for a smooth experience, the frontend client actually queries 2 resolution-widths(e.g. 0.1 latitude length) beyond the users viewport. This means as they pan, they can see some new data, and then as they stop freshly-reloaded dta for the new panned position will be loaded (again with extra "padding" cells on all sides)
