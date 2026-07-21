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

# Roadmap
A) Future development will pull the models for model browsing from a live API
B) Regions will be determined by the backend, not interpreted into GeoJSON regions by the frontend processing grid lat/lng data into GeoJSON regions (as they are presently for the world view)

# License
MIT, see LICENSE.md

# Project status
Under development
