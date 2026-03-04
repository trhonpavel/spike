import copy, time, random

def numberverify (a):
  try:
    int(a)
  except:
    return False
  return True

def scoreenter():
  while True:
    a = input()
    if numberverify (a):
      a = int(a)
      if (a<31) and (a>-1):
        return a
      else:
        print ("Score must be between 0 and 30. Try again:")
    else:
      print("Write legit score please: ")

def finddiff (ratings):
  diff = 0
  for i in range (0,4):
    for j in range (i+1,4):
      diff+=((ratings[i]-ratings[j])**2)
  return round(diff,2)

def sameness (game, playedgames):
  same = 0
  for i in range (0, len(playedgames)):
    count = 0
    for j in range (0,4):
      if game[j] in playedgames[i]:
        count+=1
    if count>same:
      same=count
    if same==4:
      return 4
  return same

def ratedraw (newgames, playedgames):
  rating = 0
  for i in range (0, len(newgames)):
    game=newgames[i]
    same=sameness([newgames[i][0][0],newgames[i][1][0],newgames[i][2][0],newgames[i][3][0]], playedgames)
    if same == 4:
      return -1
    else:
      rating += [0,0,6,20][same]
      rating += finddiff([newgames[i][0][4], newgames[i][1][4], newgames[i][2][4], newgames[i][3][4]])
  return rating

def printplayer(player):
  print()
  print("Name:", player[0])
  print("Wins:", player[1])
  playergames = 0
  for i in range (0, len(playedgames)):
    if player[0] in playedgames[i]:
      playergames+=3
  print ("Matches played:", playergames)
  print("Balls won:", player[2])
  print("Balls lost:", player[3]-player[2])
  print("Rating:", player[4])
  print("Waitings:", player[5])
  print()
  print("Played matches:")
  for i in range (0, len(playedgames)):
    if player[0] in playedgames[i]:
      for j in range (0,3):
        print(playedgames[i][table[4*j+0]] + " & " + playedgames[i][table[4*j+1]]+ "  " + str(totalresults[i][2*j])+":"+ str(totalresults[i][2*j+1]) + "  " + playedgames[i][table[4*j+2]] + " & " + playedgames[i][table[4*j+3]])

def printplayers(players):
  players.sort(key=lambda x:x[0])
  print("Players in the tournament:")
  stringplayers=""
  for i in range(0,len(players)):
    stringplayers+=str(players[i][0])
    if i!=(len(players)-1):
      stringplayers+=", "
  print(stringplayers)

def printresults (players):
  players.sort(key=lambda x:x[4])
  players.reverse()
  print()
  print("RESULTS")
  for i in range (0, len(players)):
    print (i+1, " " + players[i][0] + "  " + str(round(players[i][4],2)) + "pts")

def searchplayers(players, name):
  for i in range(0,len(players)):
    if players[i][0]==name:
      return i
  return -1

def rateplayer (player):
  rating=0
  rating+=2*player[1]
  rating+=3*player[5]
  if player[3]!=0:
    rating+=round(player[2]/player[3]*2,2)
  return rating  

print()
print ("SPIKEBALL TOURNAMENT INDIVIDUAL APP")
print ("Programmed by Lucien Sima")
print ("October 9, 2019")
print()

players = []
playedgames = []
table = [0,1,2,3,0,2,1,3,0,3,1,2]
totalresults = []

while True:
  command = input("Main menu (add / del / print / play / stats / results): ")
  if command == "add":
    addedname = input("Write player's name: ")
    newname = True
    for i in range (0, len(players)):
      if players[i][0] == addedname:
        newname = False
        break
    if newname:
      players.append([addedname, 0, 0, 0, 0, 0])
      print ("Player",addedname,"added.")
    else:
     print("Error, name", addedname,"already used.")

  elif command == "del":
    printplayers(players)
    deletedname = input("Name a player to delete: ")
    index = searchplayers(players, deletedname)
    if index!=-1:
      del(players[index])
      print ("Player ", deletedname, " deleted.")
    else:
      print ("Error, player", deletedname, "not in tournament.")

  elif command == "print":
    printplayers(players)

  elif command == "results":
    printresults(players)

  elif command == "stats":
    printplayers(players)
    editedname = input("Name a player to show: ")
    index = searchplayers (players, editedname)
    if index!=-1:
      printplayer(players[index])
    else:
      print ("Error, player", editedname, "not in tournament.")

  elif command == "play":
    confirm = input("Do you really want to draw new round (yes)? ")
    if (confirm == "yes") and len(players)>3:
      random.shuffle(players)
      waitingnumber = len(players)%4
      waitingplayers = []
      players.sort(key=lambda x:x[5])
      players2 = copy.deepcopy(players)
      print()
      for i in range (0, waitingnumber):
        del(players2[0])
        waitingplayers.append(players[i][0])
        print("Player", players[i][0], "has a break!")
      players2.sort(key=lambda x:-x[4])
      gamescount = int(len(players2)/4)
      newgames = []
      for i in range (0, gamescount):
        newgames.append([players2[4*i],players2[4*i+1],players2[4*i+2],players2[4*i+3]])
      for i in range (0, gamescount-1):
        if (sameness([newgames[i][0][0],newgames[i][1][0],newgames[i][2][0],newgames[i][3][0]], playedgames)==4) or ((sameness([newgames[i+1][0][0],newgames[i+1][1][0],newgames[i+1][2][0],newgames[i+1][3][0]], playedgames)==4) and (i==gamescount-2)): 
          mindifference = 100000
          change = False
          for j in range (0,4):
            for k in range (0,4):
              gameplayers=[]
              game2players=[]
              for l in range (0,4):
                if l!=j:
                  gameplayers.append(newgames[i][l][0])
                else:
                  gameplayers.append(newgames[i+1][k][0])
              for m in range (0,4):
                if m!=k:
                  game2players.append(newgames[i+1][m][0])
                else:
                  game2players.append(newgames[i][j][0])
              if sameness (gameplayers, playedgames)!=4 and sameness (game2players, playedgames)!=4:
                difference = abs(newgames[i][j][4] - newgames[i+1][k][4])
                if difference < mindifference:
                  change = True
                  bestj = j
                  bestk = k
                  mindifference = difference
          if change:
            pom = newgames[i][bestj].copy()
            newgames[i][bestj] = newgames[i+1][bestk].copy()
            newgames[i+1][bestk] = pom.copy()
      drawngames = copy.deepcopy(newgames)
      ranking = ratedraw (newgames, playedgames)
      if ranking == -1:
        bestranking = 10000000
      else:
        bestranking = ranking
      startsearch=time.time()
      for i in range (0, gamescount-1):
        for j in range (0,4):
          for k in range (0,4):
            newgames2 = copy.deepcopy(newgames)
            pom = newgames2[i][j].copy()
            newgames2[i][j] = newgames2[i+1][k].copy()
            newgames2[i+1][k] = pom.copy()
            ranking = ratedraw (newgames2, playedgames)
            if ranking>-0.5 and ranking<bestranking:
              bestranking = ranking
              drawngames = copy.deepcopy(newgames2)
            if (time.time()-startsearch)<20:
              for ii in range (i, gamescount-1):
                l=0
                m=0
                if i==ii:
                  l=j+1
                  m=k+1
                for jj in range (l,4):
                  for kk in range (m,4):
                    newgames3 = copy.deepcopy(newgames2)
                    pom = newgames3[ii][jj].copy()
                    newgames3[ii][jj] = newgames3[ii+1][kk].copy()
                    newgames3[ii+1][kk] = pom.copy()
                    ranking = ratedraw (newgames3, playedgames)
                    if ranking>-0.5 and ranking<bestranking:
                      bestranking = ranking
                      drawngames = copy.deepcopy(newgames3)
      for i in range (0, gamescount):
        stringgame = "GAME " + str(i+1) + ": "
        for j in range (0,4):
          stringgame += drawngames[i][j][0]
          if j!=3:
            stringgame += ", "
        print (stringgame)
      print()
      confirm2 = input ("Do you want to play this draw (yes)? ")
      if confirm2 == "yes":
        results = []
        entered = []
        for i in range (0, gamescount):
          results.append([0,0,0,0,0,0])
          entered.append(0)
        entering = True
        while entering:
          print()
          command2 = input("What can I do? (enter results of game# / print / done)? ")
          if command2 == "print":
            print()
            for i in range (0, gamescount):
              if entered[i]==0:
                print ("GAME",i+1,"not played yet.")
              else:
                print ("GAME",i+1)
                for j in range (0,3):
                  print(drawngames[i][table[4*j+0]][0] + " & " + drawngames[i][table[4*j+1]][0]+ "  " + str(results[i][2*j])+":"+ str(results[i][2*j+1]) + "  " + drawngames[i][table[4*j+2]][0] + " & " + drawngames[i][table[4*j+3]][0])
              if i<gamescount-1:
                print ()       
          elif command2 == "done":
            enteredall = True
            for i in range (0, gamescount):
              if entered[i]==0:
                enteredall = False
                print("Results of the GAME", i+1, "not filled.")
            if enteredall == False:
              confirm3 = input ("You have not entered all results. Ignore it? (yes) ")
              if confirm3 == "yes":
                enteredall = True           
            if enteredall == True:
              print()
              for i in range (0, gamescount):
                for j in range (0,3):
                  print(drawngames[i][table[4*j+0]][0] + " & " + drawngames[i][table[4*j+1]][0]+ "  " + str(results[i][2*j])+":"+ str(results[i][2*j+1]) + "  " + drawngames[i][table[4*j+2]][0] + " & " + drawngames[i][table[4*j+3]][0]) 
              print()
              confirm3 = input("Are all entered results correct? (yes) ")
              if confirm3 == "yes":
                entering = False
          elif numberverify (command2):
            i = int(command2)-1
            if (i < gamescount) and (i > -1):
              for j in range (0,3):
                print()
                print (drawngames[i][table[4*j+0]][0] + " & " + drawngames[i][table[4*j+1]][0] + " vs. " + drawngames[i][table[4*j+2]][0] + " & " + drawngames[i][table[4*j+3]][0])
                print (drawngames[i][table[4*j+0]][0] + " & " + drawngames[i][table[4*j+1]][0] + " score: ")
                results[i][2*j+0] = scoreenter()
                print (drawngames[i][table[4*j+2]][0] + " & " + drawngames[i][table[4*j+3]][0] + " score: ")
                results[i][2*j+1] = scoreenter()
              entered[i]=1       
        for i in range (0, gamescount):
          playedgames.append([drawngames[i][0][0], drawngames[i][1][0], drawngames[i][2][0], drawngames[i][3][0]])
          totalresults.append(results[i])
          for j in range (0,3):
            ptsteam1 = results[i][2*j]
            ptsteam2 = results[i][2*j+1]
            drawngames[i][table[4*j+0]][2] += ptsteam1
            drawngames[i][table[4*j+1]][2] += ptsteam1
            drawngames[i][table[4*j+2]][2] += ptsteam2
            drawngames[i][table[4*j+3]][2] += ptsteam2
            for k in range (0,4):
              drawngames[i][table[4*j+k]][3] += (ptsteam1 + ptsteam2)
            if ptsteam1 > ptsteam2:
              drawngames[i][table[4*j+0]][1] +=1
              drawngames[i][table[4*j+1]][1] +=1
            elif ptsteam2 > ptsteam1:
              drawngames[i][table[4*j+2]][1] +=1
              drawngames[i][table[4*j+3]][1] +=1
        for i in range (0, len(players)):
          activeplayer = True
          for j in range (0, waitingnumber):
            if players[i][0] == waitingplayers[j]:
              activeplayer = False
              players[i][5] += 1
          if activeplayer:
            for j in range (0, gamescount):
              for k in range (0,4):
                if players[i][0] == drawngames[j][k][0]:
                  players[i] = copy.deepcopy(drawngames[j][k])
          players[i][4] = rateplayer(players[i])
        print ()
        print("-------------------")
        print("BACKUP DATA:")
        print("Hráči:", players)
        print ("Hry:", playedgames)
        print ("Výsledky her:", totalresults)
        print("-------------------")
        printresults(players)
    elif len(players)<4:
      print ("Not enough players.")
  print()
