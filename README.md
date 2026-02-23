# heiplanet Frontend Mapping application


# Description
The heiplanet Mapping project shows the predictions and predicted susceptibility in the future of different diseases by Infectious disease/Climate models from the group, across different regions in the map.

This repository contains the frontend for the Climate Map. The user can browse for models with the Model Selector, and change the year to see future suspcetibility predictions

It can be configured to request and display NUTS3 regions, or worldwide equivalent regions, which is dependent upon the underlying model.

## Background context on the view types (technically specific)
For the worldwide view, the data is projected from individual points into polygons on the frontend.

## Main components diagram:
(Out of date, new diagram needed)

## Example: Worldwide Simple R0 example:
<img width="3700" height="1648" alt="image" src="https://github.com/user-attachments/assets/625d4432-faad-4e5f-b60f-4af96d6848b1" />


## Example: NUTS version:
![image](https://github.com/user-attachments/assets/b7273a78-15a7-4304-88ea-d4b537f7c03e)



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
