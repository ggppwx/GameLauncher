# overview
a simple game laucnher built in electron. it's similar to steam 


# project structure 
follow typical electron app structure 




# functions 
- detect steam games
  - find all steam games running locally 
  - import the location and its pic
  - display the game card in the app 
  - the user can launch the game by clicking the game card's button 
- lauch games 



# technoligies 
- electron 
- react
- tailwind
- shadcn/ui
- framer motion
- sqllite 




# plan

## skelton 
- [X] build the skeleton




## game scan feature 
- [X] game launcher's config file and user data
  - launcher's config file %APPDATA%\Gamelauncher\config.json
  - user data (in sql lite) %LOCALAPPDATA%\Gamelauncher\launcher.db
- [X] introduce a sqllite db to save game informations 
  - save metadatas 
  - use disk cache for images  
  - files can be saved in %LOCALAPPDATA%\Gamelauncher\
- [X] scan all the steam games and save the info
  - scan steam games button to trigger scan 
    - need to have config file to save where the steam location is 
  - including the appid, locoation, name. thumbnail etc 
  - save the info in a consistent store (database on something similar )
  - show game thumbnails in game card 
  - the appid is used for lauching the game 

### scan games using steam api 
- [X] import games from steam api. 
  - use the same game table in the database 
  - include installed games and uninstalled games 
  - keep current styles/logic unchanged 
    - for uninstaleed games, make it dimmer 



## game orgnizer 
- [X] make gmae filter work 
- [X] category games 
  - tag based game orgnaization  
    - for example, we have 'backlog' 'playing' 'complete' 'abandon' as default tag 
    - like steam, we can put the same tag together 
    - you can add tags for each game in the game card 
      - right click the game card, click 'add tag'
      - a pop up show up and you can input tag 


## game statistic
- [X] Implment basic statistic in the statistic tab 
  - use the game_session table we already have, query the database to get statistic info
- [X] create a bar chart, list the games played in the last 7 days
  - sorted by play times 
- [ ] calendar view on recent game sessions 

### game notes and tracking 




## packaging 
- [X] package the electorn app so that I can distributed and install it in other pc
  - use electron-builder
  - platform: windows 
  - 2 different ways to ship the application  
    - NSIS
    - zip   




## plugins support 
- build a way allow others write plugins 




