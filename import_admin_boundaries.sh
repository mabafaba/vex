#!/bin/bash

# Administrative Boundaries Import Script
# Usage: ./import_admin_boundaries.sh -c <country> [-r <region>] [-f] [-h]
# Example: ./import_admin_boundaries.sh -c germany
# Example: ./import_admin_boundaries.sh -c mexico -r north-america

set -e  # Exit on any error

# Default values
COUNTRY=""
REGION=""
FORCE_DOWNLOAD=false
DATA_DIR="./data"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_help() {
    cat << EOF
Administrative Boundaries Import Script

USAGE:
    $0 -c <country> [-r <region>] [-f] [-h]

OPTIONS:
    -c <country>    Country name (required)
                   Examples: germany, mexico, france, italy, spain, etc.
    
    -r <region>     Region/continent (optional, auto-detected if not provided)
                   Options: europe, north-america, south-america, africa, asia, 
                           australia-oceania, central-america
    
    -f              Force download even if files already exist
    
    -h              Show this help message

EXAMPLES:
    $0 -c germany
    $0 -c mexico -r north-america
    $0 -c france -f
    $0 -c italy -r europe

REQUIREMENTS:
    - curl (for downloading)
    - ogr2ogr (GDAL tools for data conversion)
    - mongoimport (MongoDB tools)
    - Node.js (for running the import script)

The script will:
1. Download the OSM PBF file for the specified country
2. Convert it to GeoJSON with administrative boundary filtering
3. Import the data into MongoDB
4. Update parent-child relationships between administrative levels

EOF
}

# Function to detect region based on country
detect_region() {
    local country="$1"
    
    case "$country" in
        # Europe
        germany|france|italy|spain|portugal|netherlands|belgium|luxembourg|switzerland|austria|poland|czech-republic|slovakia|hungary|romania|bulgaria|greece|slovenia|croatia|bosnia-herzegovina|serbia|montenegro|albania|macedonia|kosovo|denmark|sweden|norway|finland|iceland|estonia|latvia|lithuania|belarus|ukraine|moldova|ireland-and-northern-ireland|great-britain|isle-of-man|malta|cyprus|turkey|georgia|andorra|monaco|liechtenstein|faroe-islands|azores)
            echo "europe"
            ;;
        # North America
        canada|greenland|mexico)
            echo "north-america"
            ;;
        # South America
        brazil|argentina|chile|colombia|venezuela|peru|ecuador|bolivia|paraguay|uruguay|guyana|suriname|french-guiana)
            echo "south-america"
            ;;
        # Central America
        guatemala|belize|honduras|el-salvador|nicaragua|costa-rica|panama)
            echo "central-america"
            ;;
        # Africa
        algeria|egypt|libya|morocco|tunisia|sudan|south-sudan|ethiopia|somalia|kenya|tanzania|uganda|rwanda|burundi|democratic-republic-of-the-congo|central-african-republic|chad|niger|nigeria|cameroon|equatorial-guinea|gabon|republic-of-the-congo|angola|zambia|malawi|mozambique|zimbabwe|botswana|namibia|south-africa|lesotho|swaziland|madagascar|mauritius|seychelles|comoros|djibouti|eritrea|ghana|burkina-faso|mali|senegal|gambia|guinea-bissau|guinea|sierra-leone|liberia|cote-divoire|benin|togo|cape-verde|sao-tome-and-principe)
            echo "africa"
            ;;
        # Asia
        china|india|indonesia|pakistan|bangladesh|japan|philippines|vietnam|turkey|iran|thailand|myanmar|south-korea|iraq|afghanistan|uzbekistan|malaysia|saudi-arabia|nepal|yemen|north-korea|sri-lanka|cambodia|jordan|azerbaijan|united-arab-emirates|tajikistan|israel|laos|singapore|oman|kuwait|lebanon|kyrgyzstan|mongolia|armenia|qatar|bahrain|east-timor|palestine|brunei|bhutan|maldives)
            echo "asia"
            ;;
        # Australia and Oceania
        australia|new-zealand|papua-new-guinea|fiji|solomon-islands|vanuatu|samoa|tonga|kiribati|palau|nauru|tuvalu|marshall-islands|micronesia)
            echo "australia-oceania"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Function to check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v ogr2ogr &> /dev/null; then
        missing_deps+=("ogr2ogr (GDAL)")
    fi
    
    if ! command -v mongoimport &> /dev/null; then
        missing_deps+=("mongoimport (MongoDB tools)")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node (Node.js)")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install the missing dependencies and try again."
        echo ""
        echo "For GDAL on macOS with conda:"
        echo "  conda create -n gdal-env gdal"
        echo "  conda activate gdal-env"
        echo ""
        echo "For MongoDB tools:"
        echo "  brew install mongodb/brew/mongodb-database-tools"
        exit 1
    fi
}

# Function to download PBF file
download_pbf() {
    local country="$1"
    local region="$2"
    local pbf_file="${DATA_DIR}/${country}-latest.osm.pbf"
    local url="https://download.geofabrik.de/${region}/${country}-latest.osm.pbf"
    
    if [[ -f "$pbf_file" && "$FORCE_DOWNLOAD" == false ]]; then
        print_warning "PBF file already exists: $pbf_file"
        print_warning "Use -f flag to force re-download"
        return 0
    fi
    
    print_status "Downloading $country PBF file from Geofabrik..."
    print_status "URL: $url"
    
    if curl -f -L -o "$pbf_file" "$url"; then
        print_success "Downloaded: $pbf_file"
        return 0
    else
        print_error "Failed to download PBF file. Please check:"
        print_error "1. Country name is correct: $country"
        print_error "2. Region is correct: $region"
        print_error "3. Internet connection is working"
        print_error "4. URL exists: $url"
        return 1
    fi
}

# Function to convert PBF to GeoJSON
convert_to_geojson() {
    local country="$1"
    local pbf_file="${DATA_DIR}/${country}-latest.osm.pbf"
    local geojson_file="${DATA_DIR}/admin_boundaries_${country}.geojson"
    
    if [[ -f "$geojson_file" && "$FORCE_DOWNLOAD" == false ]]; then
        print_warning "GeoJSON file already exists: $geojson_file"
        print_warning "Use -f flag to force re-conversion"
        return 0
    fi
    
    print_status "Converting PBF to GeoJSON with administrative boundary filtering..."
    print_status "This may take several minutes for large countries..."
    
    if ogr2ogr -f GeoJSON "$geojson_file" "$pbf_file" multipolygons -where "boundary='administrative'"; then
        print_success "Converted to GeoJSON: $geojson_file"

        # only keep the features array
        jq '.features' "$geojson_file" > "$geojson_file.features.json"
        # mv "$geojson_file.features.json" "$geojson_file"
        print_success "Extracted features from GeoJSON: $geojson_file"
        print_success "File size: $(du -h "$geojson_file" | cut -f1)"

        # Show file size
        if command -v du &> /dev/null; then
            local size=$(du -h "$geojson_file" | cut -f1)
            print_status "GeoJSON file size: $size"
        fi
        
        return 0
    else
        print_error "Failed to convert PBF to GeoJSON"
        return 1
    fi
}



# Function to get the absolute path of the GeoJSON file
get_geojson_path() {
    local country="$1"
    local geojson_file="${DATA_DIR}/admin_boundaries_${country}.geojson"
    # Use portable method to get absolute path (realpath not available on macOS by default)
    cd "$(dirname "$geojson_file")" && echo "$(pwd)/$(basename "$geojson_file")"
}

# Function to run the import process
run_import() {
    local country="$1"
    local geojson_path="$2"
    local initialize_script="${SCRIPT_DIR}/services/administrativelevels/setup/initialize.js"
    
    print_status "Starting MongoDB import and relationship processing..."
    print_status "Using GeoJSON file: $geojson_path"
    print_status "This process may take 10-30 minutes depending on country size..."
    
    cd "$SCRIPT_DIR"
    
    if node "$initialize_script" "$geojson_path"; then
        print_success "Import completed successfully!"
        print_success "Administrative boundaries for $country have been imported to MongoDB"
    else
        print_error "Import failed. Check the error messages above."
        return 1
    fi
}

# Function to cleanup temporary files
cleanup() {
    # Remove any temporary files if needed
    # Currently no cleanup needed since we don't modify initialize.js
    :
}

# Parse command line arguments
while getopts "c:r:fh" opt; do
    case $opt in
        c)
            COUNTRY="$OPTARG"
            ;;
        r)
            REGION="$OPTARG"
            ;;
        f)
            FORCE_DOWNLOAD=true
            ;;
        h)
            show_help
            exit 0
            ;;
        \?)
            print_error "Invalid option: -$OPTARG"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$COUNTRY" ]]; then
    print_error "Country is required. Use -c <country>"
    show_help
    exit 1
fi

# Auto-detect region if not provided
if [[ -z "$REGION" ]]; then
    REGION=$(detect_region "$COUNTRY")
    if [[ -z "$REGION" ]]; then
        print_error "Could not auto-detect region for country: $COUNTRY"
        print_error "Please specify region with -r <region>"
        print_error "Available regions: europe, north-america, south-america, africa, asia, australia-oceania, central-america"
        exit 1
    fi
    print_status "Auto-detected region: $REGION"
fi

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

print_status "Starting administrative boundaries import for: $COUNTRY"
print_status "Region: $REGION"
print_status "Data directory: $DATA_DIR"
print_status "Force download: $FORCE_DOWNLOAD"
echo ""

# Check dependencies
print_status "Checking dependencies..."
check_dependencies
print_success "All dependencies are available"
echo ""

# Step 1: Download PBF file
print_status "Step 1: Downloading PBF file..."
if ! download_pbf "$COUNTRY" "$REGION"; then
    exit 1
fi
echo ""

# Step 2: Convert to GeoJSON
print_status "Step 2: Converting to GeoJSON..."
if ! convert_to_geojson "$COUNTRY"; then
    exit 1
fi
echo ""

# Step 3: Get GeoJSON file path
print_status "Step 3: Preparing for import..."
GEOJSON_PATH=$(get_geojson_path "$COUNTRY")
print_status "GeoJSON file path: $GEOJSON_PATH"
echo ""

# Step 4: Run import
print_status "Step 4: Importing to MongoDB..."
if ! run_import "$COUNTRY" "$GEOJSON_PATH"; then
    exit 1
fi
echo ""

print_success "🎉 Administrative boundaries import completed successfully!"
print_success "Country: $COUNTRY"
print_success "Region: $REGION"
print_success "Data imported to MongoDB database 'vex' collection 'admin_boundaries'"
