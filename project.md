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


## Game details 
- [X] when clicking the game card (left click the game cover, not "play" or "delete"), show a "Game detail" diaglog page 
  - this dialog page is pretty large, it should cover almost 4/5 area of the game card grid area 
  - on the top of page, there should be a "play" button, like steam 
  - this page shows the game detail, game, also the game statistics 
  - you close the page by clicking X or press esc 



## game statistic
- [X] Implment basic statistic in the statistic tab 
  - use the game_session table we already have, query the database to get statistic info
- [X] create a bar chart, list the games played in the last 7 days
  - sorted by play times 
- [ ] calendar view on recent game sessions 

## game notes and tracking 
- Note taking system 



## Build AI into the system 
### preparation steps 
- [X] add a "recommendation" tab after "library" tab,  where it shows 3 random games, it will use the exact same gamecard component used in libarary 
- you can skip and it will show you next 3 games 
- for each game session. 

### Smart recommendation (phase 1. simple working version)
- [X] method: bandit 
- only used for current user
- gaming session data already in game_sessions table 
  - we can derived a few signals from the table 
-  context
  - day of the week (weekdays/weekend)
  - time of the day (Morning / Afternoon / Night)
  - Last played genres (in the db games table )
  - time since last session
- pre bandit filter
  - installed = true 
- reward (somthing like the following)
  - No launch → 0.0
  - Launch, quit < 15 min → 0.2
  - Launch, 15–60 min → 0.7
  - Launch, ≥ 60 min and no crash → 1.0
- storage
  - we already have the existing table game_sessions to save the gaming history 
  - use the same sqlite db to save the ML data 
- code structure 
  - create a separte module/dir for the this ML recommendation 
  - prefer writing new functions instead of modifyiing current functions  
  - create a simple LinUCB lib to calculate the game score 
  - apply a simple diversify rule to pick games with similarity (MMR)
    - for simiplity, the sim(i, j) function only compares the Genre/tag of the game (genres/tags in the db) 

### smart recommandation phase 2
- now I would like to build a hybrind contextural banidt. and put the game's feature into the ranking 
  - features to have for now are following, we can get them from db(games table)
    - genras
    - tags
    - playtime
    - timeLastPlay
  - need to integrate game feature into "warm start" and live path 
  


## Notes 
- [X] add a new tab after statistics called notes 
  - [X] It will show up all the notes from the game
  - [X] breakdown the notes by game, each game's note is a section 
    - the secion has the name, last played time 
    - name, timeLastPlay, playtime, then notes
  - [X] the notes are sorted by recent played games 




## packaging 
- [X] package the electorn app so that I can distributed and install it in other pc
  - use electron-builder
  - platform: windows 
  - 2 different ways to ship the application  
    - NSIS
    - zip   




## plugins support 
- build a way allow others write plugins 




