package com.northernrailway.simulator;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.*;
import android.graphics.drawable.ColorDrawable;
import android.view.*;
import java.util.*;

public class MainActivity extends Activity {
    @Override public void onCreate(Bundle b){ super.onCreate(b); getWindow().setFlags(1024,1024); setContentView(new SimView()); }

    class SimView extends View {
        Paint p=new Paint(3); Random rnd=new Random(7);
        float speed=0, distance=0, throttle=0, brake=0, locoBrake=0;
        boolean running=false, rain=false, night=false, emergency=false;
        long last=System.nanoTime();
        String[] stations={"NEW DELHI","GHAZIABAD","MEERUT CITY","MUZAFFARNAGAR","SAHARANPUR","AMBALA CANTT"};
        float[] km={0,12,61,109,151,199};
        int station=1; String signal="GREEN"; float ai=34;
        RectF throttleR=new RectF(), brakeR=new RectF(), startR=new RectF(), hornR=new RectF(), viewR=new RectF();

        SimView(){ super(MainActivity.this); p.setTypeface(Typeface.create("sans",0)); setFocusable(true); }

        void txt(Canvas c,String s,float x,float y,float size,int col,boolean bold){
            p.setColor(col); p.setTextSize(size); p.setTypeface(Typeface.create("sans",bold?Typeface.BOLD:Typeface.NORMAL)); c.drawText(s,x,y,p);
        }
        void box(Canvas c,float l,float t,float r,float b,int col){p.setColor(col);c.drawRoundRect(new RectF(l,t,r,b),12,12,p);}
        float clamp(float v){return Math.max(0,Math.min(100,v));}

        @Override protected void onDraw(Canvas c){
            super.onDraw(c); long now=System.nanoTime(); float dt=Math.min(.06f,(now-last)/1e9f); last=now;
            if(running && !emergency){
                float a=(throttle/100f)*42f-(brake/100f)*65f-(locoBrake/100f)*18f-0.55f;
                speed=Math.max(0,Math.min(130,speed+a*dt));
                distance+=speed*dt/3600f;
                ai-=52*dt/3600f; if(ai<4)ai=34;
                if(speed>limit()+5) brake=Math.max(brake,35);
                if(distance>=199){distance=199;speed=0;running=false;throttle=0;}
            }
            drawWorld(c);
            drawHUD(c);
            drawDesk(c);
            postInvalidateDelayed(30);
        }
        int limit(){ if(distance<12)return 30; if(distance<61)return 110; if(distance<109)return 120; if(distance<151)return 110; return 100; }

        void drawWorld(Canvas c){
            int w=getWidth(),h=getHeight();
            int sky=night?Color.rgb(12,22,34):Color.rgb(112,143,160);
            c.drawColor(sky);
            p.setColor(night?Color.rgb(29,39,35):Color.rgb(92,112,73)); c.drawRect(0,h*.50f,w,h,p);
            // distant terrain
            p.setColor(night?Color.rgb(25,33,38):Color.rgb(101,120,91));
            Path hills=new Path(); hills.moveTo(0,h*.51f);
            for(int x=0;x<=w;x+=80) hills.lineTo(x,h*.42f-(float)Math.abs(Math.sin(x*.01))*55);
            hills.lineTo(w,h*.57f);hills.lineTo(0,h*.57f);hills.close();c.drawPath(hills,p);
            // fields
            p.setStrokeWidth(2);p.setColor(night?Color.rgb(40,57,44):Color.rgb(112,133,88));
            for(int x=0;x<w;x+=90)c.drawLine(x,h*.62f,x+55,h*.56f,p);
            // road
            p.setColor(Color.rgb(56,58,58)); c.drawRect(0,h*.61f,w,h*.645f,p);
            p.setColor(Color.rgb(180,175,157));p.setStrokeWidth(2);
            for(int x=0;x<w;x+=100)c.drawLine(x,h*.627f,x+42,h*.627f,p);
            // OHE
            p.setColor(Color.rgb(72,79,79));p.setStrokeWidth(3);
            for(int x=70;x<w;x+=150){c.drawLine(x,h*.60f,x,h*.20f,p);c.drawLine(x-42,h*.24f,x+42,h*.24f,p);}
            c.drawLine(0,h*.24f,w,h*.24f,p);
            // track perspective
            Path tr=new Path();tr.moveTo(w*.37f,h*.60f);tr.lineTo(w*.63f,h*.60f);tr.lineTo(w,h);tr.lineTo(0,h);tr.close();
            p.setColor(Color.rgb(48,48,49));c.drawPath(tr,p);
            p.setColor(Color.LTGRAY);p.setStrokeWidth(5);
            c.drawLine(w*.43f,h*.61f,w*.08f,h,p);c.drawLine(w*.57f,h*.61f,w*.92f,h,p);
            p.setStrokeWidth(4);p.setColor(Color.rgb(104,83,68));
            for(int y=(int)(h*.65f);y<h;y+=28){float t=(y-h*.61f)/(h*.39f);float half=18+t*w*.56f;c.drawLine(w/2-half,y,w/2+half,y,p);}
            // AI train
            float ax=w*.50f+(Math.min(1,Math.max(0,ai/35))*w*.24f);
            box(c,ax-25,h*.545f-18,ax+25,h*.545f,Color.rgb(190,194,195));
            p.setColor(Color.rgb(38,52,60));c.drawRect(ax-17,h*.545f-14,ax-4,h*.545f-6,p);c.drawRect(ax+5,h*.545f-14,ax+18,h*.545f-6,p);
            // signal
            float sx=w*.80f, sy=h*.38f;
            p.setColor(Color.DKGRAY);p.setStrokeWidth(5);c.drawLine(sx,sy,sx,h*.61f,p);
            box(c,sx-14,sy-48,sx+14,sy+20,Color.rgb(18,23,27));
            p.setColor(signal.equals("GREEN")?Color.rgb(80,220,130):Color.rgb(244,195,78));c.drawCircle(sx,sy-27,8,p);
            txt(c,signal,sx-30,sy-60,12,Color.WHITE,true);
            // player loco
            float px=w*.43f+Math.min(1,distance/199f)*w*.30f, py=h*.56f;
            box(c,px-68,py-56,px+68,py,Color.rgb(171,56,48));
            p.setColor(Color.rgb(30,48,57));c.drawRect(px-51,py-43,px-16,py-18,p);c.drawRect(px+14,py-43,px+49,py-18,p);
            p.setColor(Color.rgb(23,24,25));c.drawRect(px-55,py-8,px+55,py+8,p);
            txt(c,"WAP-7",px-22,py-62,11,Color.WHITE,true);
            if(rain){p.setColor(Color.argb(130,210,225,235));p.setStrokeWidth(2);for(int x=0;x<w;x+=22){int y=(int)((x*13+System.currentTimeMillis()/3)%((int)(h*.55)));c.drawLine(x,y,x-7,y+25,p);}}
            if(night){p.setColor(Color.argb(70,0,0,0));c.drawRect(0,0,w,h,p);}
        }

        void drawHUD(Canvas c){
            int w=getWidth(),h=getHeight();
            p.setColor(Color.argb(220,7,13,18));c.drawRect(0,0,w,70,p);
            txt(c,"NORTHERN RAILWAY SIMULATOR",18,28,20,Color.WHITE,true);
            txt(c,"NEW DELHI  →  GHAZIABAD  →  MEERUT CITY  →  MUZAFFARNAGAR  →  SAHARANPUR  →  AMBALA",18,52,11,Color.LTGRAY,false);
            String sig=signal+"  •  LIMIT "+limit()+" km/h";
            txt(c,sig,w-250,28,12,signal.equals("GREEN")?Color.rgb(80,220,130):Color.rgb(244,195,78),true);
            txt(c,String.format(Locale.US,"SPEED %03d",Math.round(speed)),w-250,53,16,Color.WHITE,true);
        }

        void drawDesk(Canvas c){
            int w=getWidth(),h=getHeight();
            float top=h*.70f;
            p.setColor(Color.argb(235,9,14,19));c.drawRect(0,top,w,h,p);
            txt(c,"DRIVER DESK",20,top+30,16,Color.WHITE,true);
            txt(c,String.format(Locale.US,"DIST %.1f km",distance),20,top+55,12,Color.LTGRAY,false);
            txt(c,"NEXT: "+nextStation(),20,top+77,12,Color.rgb(215,168,75),true);
            // throttle
            slider(c,"THROTTLE",throttleR,150,top+15,360,top+52,throttle);
            slider(c,"TRAIN BRAKE",brakeR,390,top+15,600,top+52,brake);
            slider(c,"LOCO BRAKE",new RectF(),630,top+15,840,top+52,locoBrake);
            box(c,startR=w>0?new RectF(w-270,top+15,w-165,top+58):new RectF(),running?Color.rgb(70,100,78):Color.rgb(34,53,62));
            txt(c,running?"RUNNING":"START",w-247,top+42,12,Color.WHITE,true);
            box(c,hornR=new RectF(w-155,top+15,w-45,top+58),Color.rgb(48,43,34));txt(c,"HORN",w-126,top+42,12,Color.WHITE,true);
            box(c,new RectF(20,top+94,125,top+128),Color.rgb(32,43,50));txt(c,"RAIN",40,top+116,11,Color.WHITE,true);
            box(c,new RectF(135,top+94,240,top+128),Color.rgb(32,43,50));txt(c,"NIGHT",154,top+116,11,Color.WHITE,true);
            txt(c,"TAP/DRAG SLIDERS • TAP START • EMERGENCY: HOLD BRAKE AT 100%",260,top+117,11,Color.rgb(145,157,164),false);
        }

        void slider(Canvas c,String label,RectF rr,float l,float t,float r,float b,float val){
            rr.set(l,t,r,b);box(c,rr,Color.rgb(24,34,41));txt(c,label,l+8,t+15,9,Color.rgb(150,164,171),true);
            p.setColor(Color.rgb(55,66,72));c.drawRoundRect(new RectF(l+8,t+22,r-8,t+30),4,4,p);
            p.setColor(Color.rgb(215,168,75));c.drawRoundRect(new RectF(l+8,t+22,l+8+(r-l-16)*val/100f,t+30),4,4,p);
            txt(c,Math.round(val)+"%",r-42,t+15,10,Color.WHITE,true);
        }
        String nextStation(){for(int i=0;i<km.length;i++)if(km[i]>distance+.5f)return stations[i]+"  "+String.format(Locale.US,"%.1f km",km[i]-distance);return "AMBALA CANTT";}
        
        @Override public boolean onTouchEvent(android.view.MotionEvent e){
            float x=e.getX(),y=e.getY(); if(e.getAction()==MotionEvent.ACTION_DOWN||e.getAction()==MotionEvent.ACTION_MOVE){
                if(throttleR.contains(x,y)){throttle=clamp((x-throttleR.left)/throttleR.width()*100); if(throttle>0)brake=0; return true;}
                if(brakeR.contains(x,y)){brake=clamp((x-brakeR.left)/brakeR.width()*100); if(brake>0)throttle=0; return true;}
                if(y>hDesk() && x>getWidth()-270 && x<getWidth()-165 && e.getAction()==MotionEvent.ACTION_DOWN){running=true;emergency=false;return true;}
                if(y>hDesk() && x>getWidth()-155 && e.getAction()==MotionEvent.ACTION_DOWN){return true;}
            }
            if(e.getAction()==MotionEvent.ACTION_UP){
                if(hornR.contains(x,y)){running=running; return true;}
                if(y>hDesk()+94 && y<hDesk()+135 && x<130){rain=!rain;return true;}
                if(y>hDesk()+94 && y<hDesk()+135 && x>=130&&x<250){night=!night;return true;}
                if(y>hDesk()+15 && y<hDesk()+60 && x>getWidth()-270&&x<getWidth()-165){running=true;emergency=false;return true;}
            }
            return true;
        }
        float hDesk(){return getHeight()*.70f;}
    }
}
